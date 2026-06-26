from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.baja_inventario import BajaInventarioCrear, BajaInventarioRespuesta

router = APIRouter(prefix="/bajas", tags=["Bajas de Inventario"])

@router.get("/", response_model=list[BajaInventarioRespuesta])
def listar_bajas(
    id_articulo: int | None = Query(default=None),
    id_evento: int | None = Query(default=None),
    motivo: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    consulta = db.query(models.BajaInventario)
    if id_articulo is not None:
        consulta = consulta.filter(models.BajaInventario.id_articulo == id_articulo)
    if id_evento is not None:
        consulta = consulta.filter(models.BajaInventario.id_evento == id_evento)
    if motivo is not None:
        consulta = consulta.filter(models.BajaInventario.motivo == motivo)
    return consulta.order_by(models.BajaInventario.fecha.desc()).all()

@router.get("/{id_baja}", response_model=BajaInventarioRespuesta)
def obtener_baja(id_baja: int, db: Session = Depends(get_db)):
    baja = db.query(models.BajaInventario).filter(
        models.BajaInventario.id_baja == id_baja
    ).first()
    if not baja:
        raise HTTPException(status_code=404, detail="Baja no encontrada")
    return baja

@router.post("/", response_model=BajaInventarioRespuesta, status_code=201)
def registrar_baja(datos: BajaInventarioCrear, db: Session = Depends(get_db)):
    """
    Registra una baja de inventario. El trigger de la BD (trg_baja_inventario)
    descuenta automáticamente cantidad_total y cantidad_disponible del artículo.
    """
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == datos.id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=400, detail="El artículo indicado no existe")

    if articulo.cantidad_total < datos.cantidad:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede dar de baja {datos.cantidad} unidades: "
                   f"solo hay {articulo.cantidad_total} en total"
        )

    if datos.id_evento is not None:
        evento = db.query(models.Evento).filter(
            models.Evento.id_evento == datos.id_evento
        ).first()
        if not evento:
            raise HTTPException(status_code=400, detail="El evento indicado no existe")

    nueva = models.BajaInventario(**datos.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva