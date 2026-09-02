from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, ForeignKey, text
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app import models
from app.database import Base


# ── Modelos SQLAlchemy ────────────────────────────────────────────────────

class ListaCajon(Base):
    __tablename__ = "listacajon"
    id_cajon     = Column(Integer, primary_key=True, index=True)
    id_evento    = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    nombre       = Column(String(150), nullable=False)
    cantidad     = Column(Integer)
    modelo_color = Column(String(100))
    orden        = Column(Integer, default=0)


class PlantillaCajon(Base):
    __tablename__ = "plantillacajon"
    id_plantilla = Column(Integer, primary_key=True, index=True)
    nombre       = Column(String(150), nullable=False)
    orden        = Column(Integer, default=0)


# ── Schemas ───────────────────────────────────────────────────────────────

class ItemCajonCrear(BaseModel):
    nombre:       str
    cantidad:     Optional[int] = None
    modelo_color: Optional[str] = None
    orden:        int = 0


class ItemCajonActualizar(BaseModel):
    nombre:       Optional[str] = None
    cantidad:     Optional[int] = None
    modelo_color: Optional[str] = None
    orden:        Optional[int] = None


# ── Router ────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/cajon", tags=["Lista de Cajón"])


@router.get("/evento/{id_evento}")
def listar_cajon(id_evento: int, db: Session = Depends(get_db)):
    """Devuelve la lista de cajón del evento. Si no existe, la crea desde la plantilla."""
    items = db.query(ListaCajon).filter(
        ListaCajon.id_evento == id_evento
    ).order_by(ListaCajon.orden).all()

    if not items:
        # Primera vez: copiar la plantilla
        plantilla = db.query(PlantillaCajon).order_by(PlantillaCajon.orden).all()
        for p in plantilla:
            item = ListaCajon(
                id_evento=id_evento,
                nombre=p.nombre,
                orden=p.orden,
            )
            db.add(item)
        db.commit()
        items = db.query(ListaCajon).filter(
            ListaCajon.id_evento == id_evento
        ).order_by(ListaCajon.orden).all()

    return [
        {
            "id_cajon":     i.id_cajon,
            "nombre":       i.nombre,
            "cantidad":     i.cantidad,
            "modelo_color": i.modelo_color,
            "orden":        i.orden,
        }
        for i in items
    ]


@router.post("/evento/{id_evento}", status_code=201)
def agregar_item(id_evento: int, datos: ItemCajonCrear, db: Session = Depends(get_db)):
    """Agrega un artículo extra a la lista de cajón del evento."""
    if not db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first():
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    item = ListaCajon(id_evento=id_evento, **datos.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{id_cajon}")
def actualizar_item(
    id_cajon: int,
    datos: ItemCajonActualizar,
    db: Session = Depends(get_db),
):
    item = db.query(ListaCajon).filter(ListaCajon.id_cajon == id_cajon).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{id_cajon}", status_code=204)
def eliminar_item(id_cajon: int, db: Session = Depends(get_db)):
    item = db.query(ListaCajon).filter(ListaCajon.id_cajon == id_cajon).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    db.delete(item)
    db.commit()


@router.delete("/evento/{id_evento}/reset", status_code=204)
def resetear_cajon(id_evento: int, db: Session = Depends(get_db)):
    """Borra la lista actual y la recrea desde la plantilla."""
    db.query(ListaCajon).filter(ListaCajon.id_evento == id_evento).delete()
    db.commit()
    # Al hacer GET de nuevo se recreará desde plantilla