from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app import models
from app.schemas.evento import EventoCrear, EventoActualizar, EventoRespuesta

router = APIRouter(prefix="/eventos", tags=["Eventos"])

@router.get("/", response_model=list[EventoRespuesta])
def listar_eventos(
    estado: str | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    consulta = db.query(models.Evento)
    if estado is not None:
        consulta = consulta.filter(models.Evento.estado == estado)
    if desde is not None:
        consulta = consulta.filter(models.Evento.fecha >= desde)
    if hasta is not None:
        consulta = consulta.filter(models.Evento.fecha <= hasta)
    return consulta.order_by(models.Evento.fecha).all()

@router.get("/{id_evento}", response_model=EventoRespuesta)
def obtener_evento(id_evento: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento

@router.post("/", response_model=EventoRespuesta, status_code=201)
def crear_evento(datos: EventoCrear, db: Session = Depends(get_db)):
    nuevo = models.Evento(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.put("/{id_evento}", response_model=EventoRespuesta)
def actualizar_evento(id_evento: int, datos: EventoActualizar, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(evento, campo, valor)

    db.commit()
    db.refresh(evento)
    return evento

@router.delete("/{id_evento}", status_code=204)
def eliminar_evento(id_evento: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    db.delete(evento)
    db.commit()