from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.articulo import ArticuloCrear, ArticuloActualizar, ArticuloRespuesta

router = APIRouter(prefix="/articulos", tags=["Artículos"])

@router.get("/", response_model=list[ArticuloRespuesta])
def listar_articulos(
    id_categoria: int | None = Query(default=None),
    estado: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    consulta = db.query(models.Articulo)
    if id_categoria is not None:
        consulta = consulta.filter(models.Articulo.id_categoria == id_categoria)
    if estado is not None:
        consulta = consulta.filter(models.Articulo.estado == estado)
    return consulta.all()

@router.get("/bajo-stock", response_model=list[ArticuloRespuesta])
def listar_bajo_stock(db: Session = Depends(get_db)):
    """Artículos cuya cantidad_disponible está por debajo de cantidad_minima."""
    return db.query(models.Articulo).filter(
        models.Articulo.cantidad_disponible < models.Articulo.cantidad_minima,
        models.Articulo.estado == "activo",
    ).all()

@router.get("/{id_articulo}", response_model=ArticuloRespuesta)
def obtener_articulo(id_articulo: int, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return articulo

@router.post("/", response_model=ArticuloRespuesta, status_code=201)
def crear_articulo(datos: ArticuloCrear, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(
        models.Categoria.id_categoria == datos.id_categoria
    ).first()
    if not categoria:
        raise HTTPException(status_code=400, detail="La categoría indicada no existe")

    nuevo = models.Articulo(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.put("/{id_articulo}", response_model=ArticuloRespuesta)
def actualizar_articulo(id_articulo: int, datos: ArticuloActualizar, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(articulo, campo, valor)

    db.commit()
    db.refresh(articulo)
    return articulo

@router.delete("/{id_articulo}", status_code=204)
def eliminar_articulo(id_articulo: int, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    tiene_movimientos = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_articulo == id_articulo
    ).first()
    if tiene_movimientos:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: el artículo tiene movimientos en eventos. "
                   "Cámbialo a estado 'inactivo' en su lugar."
        )

    db.delete(articulo)
    db.commit()