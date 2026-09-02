from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app import models

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class ClienteCrear(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None


class ClienteActualizar(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None


@router.get("/")
def listar_clientes(db: Session = Depends(get_db)):
    clientes = db.query(models.Cliente).order_by(models.Cliente.nombre).all()
    resultado = []
    for c in clientes:
        eventos = db.query(models.Evento).filter(
            models.Evento.id_cliente == c.id_cliente
        ).count()
        rentas = db.query(models.Renta).filter(
            models.Renta.id_cliente == c.id_cliente
        ).count() if hasattr(models, 'Renta') else 0
        resultado.append({
            "id_cliente":  c.id_cliente,
            "nombre":      c.nombre,
            "telefono":    c.telefono,
            "correo":      c.correo,
            "direccion":   c.direccion,
            "notas":       c.notas,
            "creado_en":   c.creado_en,
            "total_eventos": eventos,
            "total_rentas":  rentas,
        })
    return resultado


@router.get("/{id_cliente}")
def obtener_cliente(id_cliente: int, db: Session = Depends(get_db)):
    c = db.query(models.Cliente).filter(
        models.Cliente.id_cliente == id_cliente
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    eventos = db.query(models.Evento).filter(
        models.Evento.id_cliente == id_cliente
    ).order_by(models.Evento.fecha.desc()).all()
    return {
        "id_cliente": c.id_cliente,
        "nombre":     c.nombre,
        "telefono":   c.telefono,
        "correo":     c.correo,
        "direccion":  c.direccion,
        "notas":      c.notas,
        "creado_en":  c.creado_en,
        "eventos":    [{"id_evento": e.id_evento, "tipo": e.tipo,
                        "fecha": e.fecha, "estado": e.estado} for e in eventos],
    }


@router.post("/", status_code=201)
def crear_cliente(datos: ClienteCrear, db: Session = Depends(get_db)):
    nuevo = models.Cliente(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/{id_cliente}")
def actualizar_cliente(
    id_cliente: int,
    datos: ClienteActualizar,
    db: Session = Depends(get_db),
):
    c = db.query(models.Cliente).filter(
        models.Cliente.id_cliente == id_cliente
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(c, campo, valor)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{id_cliente}", status_code=204)
def eliminar_cliente(id_cliente: int, db: Session = Depends(get_db)):
    c = db.query(models.Cliente).filter(
        models.Cliente.id_cliente == id_cliente
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # Desvincular eventos y rentas antes de eliminar
    db.query(models.Evento).filter(
        models.Evento.id_cliente == id_cliente
    ).update({"id_cliente": None})
    db.delete(c)
    db.commit()