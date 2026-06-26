from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.reposicion import ReposicionCrear, ReposicionRespuesta

router = APIRouter(prefix="/reposiciones", tags=["Reposiciones"])

@router.get("/", response_model=list[ReposicionRespuesta])
def listar_reposiciones(
    id_articulo: int | None = Query(default=None),
    id_proveedor: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    consulta = db.query(models.Reposicion)
    if id_articulo is not None:
        consulta = consulta.filter(models.Reposicion.id_articulo == id_articulo)
    if id_proveedor is not None:
        consulta = consulta.filter(models.Reposicion.id_proveedor == id_proveedor)
    return consulta.order_by(models.Reposicion.fecha.desc()).all()

@router.get("/{id_reposicion}", response_model=ReposicionRespuesta)
def obtener_reposicion(id_reposicion: int, db: Session = Depends(get_db)):
    reposicion = db.query(models.Reposicion).filter(
        models.Reposicion.id_reposicion == id_reposicion
    ).first()
    if not reposicion:
        raise HTTPException(status_code=404, detail="Reposición no encontrada")
    return reposicion

@router.post("/", response_model=ReposicionRespuesta, status_code=201)
def registrar_reposicion(datos: ReposicionCrear, db: Session = Depends(get_db)):
    """
    Registra una reposición de stock. El trigger de la BD
    (trg_reposicion) suma automáticamente a cantidad_total
    y cantidad_disponible del artículo.
    """
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == datos.id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=400, detail="El artículo indicado no existe")

    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id_proveedor == datos.id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=400, detail="El proveedor indicado no existe")

    nueva = models.Reposicion(**datos.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva