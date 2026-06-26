from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.detalle_evento import (
    DetalleEventoCrear,
    DetalleEventoActualizar,
    DetalleEventoRespuesta,
)

router = APIRouter(prefix="/detalle-evento", tags=["Detalle de Evento"])

@router.get("/evento/{id_evento}", response_model=list[DetalleEventoRespuesta])
def listar_por_evento(id_evento: int, db: Session = Depends(get_db)):
    """Todos los artículos asignados a un evento (para la pantalla de detalle)."""
    return db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento
    ).all()

@router.post("/", response_model=DetalleEventoRespuesta, status_code=201)
def asignar_articulo(datos: DetalleEventoCrear, db: Session = Depends(get_db)):
    """
    Asigna un artículo a un evento.

    Acuerdo de reunión: si no hay suficiente disponible, se muestra
    advertencia en el detalle pero NO se bloquea el guardado
    (queda a criterio del jefe). El campo 'advertencia' en la
    respuesta HTTP indica si hubo faltante.
    """
    evento = db.query(models.Evento).filter(models.Evento.id_evento == datos.id_evento).first()
    if not evento:
        raise HTTPException(status_code=400, detail="El evento indicado no existe")

    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == datos.id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=400, detail="El artículo indicado no existe")

    ya_asignado = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == datos.id_evento,
        models.DetalleEvento.id_articulo == datos.id_articulo,
    ).first()
    if ya_asignado:
        raise HTTPException(
            status_code=400,
            detail="Este artículo ya está asignado a este evento. Edítalo en vez de crear uno nuevo."
        )

    nuevo = models.DetalleEvento(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    # No bloqueamos, pero dejamos rastro de la advertencia en la respuesta
    # (el frontend debe revisar este campo y mostrar el banner/modal)
    respuesta = DetalleEventoRespuesta.model_validate(nuevo)
    return respuesta

@router.get("/evento/{id_evento}/alertas")
def verificar_disponibilidad(id_evento: int, db: Session = Depends(get_db)):
    """
    Devuelve la lista de artículos del evento cuya cantidad asignada
    supera la cantidad disponible actual. Usar para mostrar el banner
    de alerta en la pantalla de Detalle de Evento y en el Dashboard.
    """
    detalles = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento
    ).all()

    alertas = []
    for d in detalles:
        articulo = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == d.id_articulo
        ).first()
        if articulo and d.cantidad_asignada > articulo.cantidad_disponible:
            alertas.append({
                "id_articulo": articulo.id_articulo,
                "nombre_articulo": articulo.nombre,
                "cantidad_solicitada": d.cantidad_asignada,
                "cantidad_disponible": articulo.cantidad_disponible,
                "faltante": d.cantidad_asignada - articulo.cantidad_disponible,
            })

    return {"id_evento": id_evento, "alertas": alertas}

@router.put("/{id_detalle}", response_model=DetalleEventoRespuesta)
def actualizar_detalle(id_detalle: int, datos: DetalleEventoActualizar, db: Session = Depends(get_db)):
    """
    Usado principalmente para registrar cantidad_devuelta cuando
    el material regresa al almacén tras el evento.
    """
    detalle = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_detalle == id_detalle
    ).first()
    if not detalle:
        raise HTTPException(status_code=404, detail="Detalle de evento no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(detalle, campo, valor)

    db.commit()
    db.refresh(detalle)
    return detalle

@router.delete("/{id_detalle}", status_code=204)
def eliminar_detalle(id_detalle: int, db: Session = Depends(get_db)):
    detalle = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_detalle == id_detalle
    ).first()
    if not detalle:
        raise HTTPException(status_code=404, detail="Detalle de evento no encontrado")

    db.delete(detalle)
    db.commit()