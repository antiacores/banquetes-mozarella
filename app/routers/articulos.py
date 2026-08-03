from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/articulos", tags=["Artículos"])

ESTADOS_ACTIVOS = ("cotizacion", "pendiente", "confirmado")


def _mapa_apartados(db: Session) -> dict:
    """
    Devuelve {id_articulo: total_apartado} en una sola consulta,
    sumando lo asignado en eventos activos.
    """
    filas = db.query(
        models.DetalleEvento.id_articulo,
        func.sum(models.DetalleEvento.cantidad_asignada).label("apartado")
    ).join(
        models.Evento,
        models.DetalleEvento.id_evento == models.Evento.id_evento
    ).filter(
        models.Evento.estado.in_(ESTADOS_ACTIVOS)
    ).group_by(
        models.DetalleEvento.id_articulo
    ).all()

    return {fila.id_articulo: int(fila.apartado) for fila in filas}


def _enriquecer(articulo: models.Articulo, apartados: dict) -> dict:
    """Convierte un artículo al dict de respuesta con disponible_real."""
    apartado = apartados.get(articulo.id_articulo, 0)
    return {
        "id_articulo":              articulo.id_articulo,
        "id_categoria":             articulo.id_categoria,
        "nombre":                   articulo.nombre,
        "cantidad_total":           articulo.cantidad_total,
        "cantidad_disponible":      articulo.cantidad_disponible,
        "cantidad_disponible_real": max(0, articulo.cantidad_disponible - apartado),
        "cantidad_minima":          articulo.cantidad_minima,
        "costo_unitario":           float(articulo.costo_unitario) if articulo.costo_unitario else None,
        "estado":                   articulo.estado,
        "observaciones":            articulo.observaciones,
        "imagen_url":               articulo.imagen_url,
    }


@router.get("/")
def listar_articulos(
    id_categoria: int | None = Query(default=None),
    estado: str | None = Query(default=None),
    busqueda: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    consulta = db.query(models.Articulo)
    if id_categoria is not None:
        consulta = consulta.filter(models.Articulo.id_categoria == id_categoria)
    if estado is not None:
        consulta = consulta.filter(models.Articulo.estado == estado)
    if busqueda is not None:
        consulta = consulta.filter(models.Articulo.nombre.ilike(f"%{busqueda}%"))

    articulos = consulta.order_by(models.Articulo.nombre).all()

    # Una sola consulta para todos los apartados
    apartados = _mapa_apartados(db)
    return [_enriquecer(a, apartados) for a in articulos]


@router.get("/bajo-stock")
def listar_bajo_stock(db: Session = Depends(get_db)):
    articulos = db.query(models.Articulo).filter(
        models.Articulo.estado == "activo",
        models.Articulo.cantidad_minima > 0,
    ).all()
    apartados = _mapa_apartados(db)
    return [
        _enriquecer(a, apartados) for a in articulos
        if max(0, a.cantidad_disponible - apartados.get(a.id_articulo, 0)) < a.cantidad_minima
    ]


@router.get("/{id_articulo}")
def obtener_articulo(id_articulo: int, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    apartados = _mapa_apartados(db)
    return _enriquecer(articulo, apartados)


@router.post("/", status_code=201)
def crear_articulo(datos: dict, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(
        models.Categoria.id_categoria == datos.get("id_categoria")
    ).first()
    if not categoria:
        raise HTTPException(status_code=400, detail="La categoría indicada no existe")

    campos_validos = {
        "id_categoria", "nombre", "cantidad_total", "cantidad_disponible",
        "cantidad_minima", "costo_unitario", "estado", "observaciones"
    }
    nuevo = models.Articulo(**{k: v for k, v in datos.items() if k in campos_validos})
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    apartados = _mapa_apartados(db)
    return _enriquecer(nuevo, apartados)


@router.put("/{id_articulo}")
def actualizar_articulo(id_articulo: int, datos: dict, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    campos_validos = {
        "id_categoria", "nombre", "cantidad_total", "cantidad_disponible",
        "cantidad_minima", "costo_unitario", "estado", "observaciones", "imagen_url"
    }
    for campo, valor in datos.items():
        if campo in campos_validos:
            setattr(articulo, campo, valor)

    db.commit()
    db.refresh(articulo)
    apartados = _mapa_apartados(db)
    return _enriquecer(articulo, apartados)


@router.delete("/{id_articulo}", status_code=204)
def eliminar_articulo(id_articulo: int, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    if db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_articulo == id_articulo
    ).first():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: tiene movimientos en eventos. Cámbialo a 'inactivo'."
        )

    if db.query(models.BajaInventario).filter(
        models.BajaInventario.id_articulo == id_articulo
    ).first():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: tiene bajas registradas. Cámbialo a 'inactivo'."
        )

    db.delete(articulo)
    db.commit()