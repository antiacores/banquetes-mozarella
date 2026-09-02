from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import date
from app.database import get_db
from app import models

# Usar los modelos de models.py — NO redefinir aquí
Renta       = models.Renta
DetalleRenta = models.DetalleRenta


class DetalleRentaIn(BaseModel):
    id_articulo: int
    cantidad: int
    precio_unitario: Decimal = Decimal("0")


class RentaCrear(BaseModel):
    nombre_cliente: str
    telefono: Optional[str] = None
    fecha_entrega: date
    fecha_devolucion: Optional[date] = None
    estado: str = "cotizacion"
    notas: Optional[str] = None
    articulos: list[DetalleRentaIn] = []


class RentaActualizar(BaseModel):
    nombre_cliente: Optional[str] = None
    telefono: Optional[str] = None
    fecha_entrega: Optional[date] = None
    fecha_devolucion: Optional[date] = None
    estado: Optional[str] = None
    notas: Optional[str] = None


router = APIRouter(prefix="/rentas", tags=["Rentas"])


@router.get("/")
def listar_rentas(db: Session = Depends(get_db)):
    resultado = db.execute(
        text("SELECT * FROM vw_rentas_con_total ORDER BY creado_en DESC")
    ).mappings().all()
    return [dict(r) for r in resultado]


@router.get("/{id_renta}")
def obtener_renta(id_renta: int, db: Session = Depends(get_db)):
    renta = db.query(Renta).filter(Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(status_code=404, detail="Renta no encontrada")

    detalles = db.execute(
        text("""
            SELECT dr.id_detalle_renta, dr.id_articulo, a.nombre AS nombre_articulo,
                   dr.cantidad, dr.precio_unitario,
                   (dr.cantidad * dr.precio_unitario) AS subtotal
            FROM detallerenta dr
            JOIN articulo a ON dr.id_articulo = a.id_articulo
            WHERE dr.id_renta = :id
        """),
        {"id": id_renta}
    ).mappings().all()

    return {
        "id_renta":        renta.id_renta,
        "nombre_cliente":  renta.nombre_cliente,
        "telefono":        renta.telefono,
        "fecha_entrega":   renta.fecha_entrega,
        "fecha_devolucion": renta.fecha_devolucion,
        "estado":          renta.estado,
        "notas":           renta.notas,
        "articulos":       [dict(d) for d in detalles],
    }


@router.post("/", status_code=201)
def crear_renta(datos: RentaCrear, db: Session = Depends(get_db)):
    nueva = Renta(
        nombre_cliente=datos.nombre_cliente,
        telefono=datos.telefono,
        fecha_entrega=datos.fecha_entrega,
        fecha_devolucion=datos.fecha_devolucion,
        estado=datos.estado,
        notas=datos.notas,
    )
    db.add(nueva)
    db.flush()

    for art in datos.articulos:
        detalle = DetalleRenta(
            id_renta=nueva.id_renta,
            id_articulo=art.id_articulo,
            cantidad=art.cantidad,
            precio_unitario=art.precio_unitario,
        )
        db.add(detalle)

    db.commit()
    db.refresh(nueva)
    return {"id_renta": nueva.id_renta, "mensaje": "Renta creada correctamente"}


@router.put("/{id_renta}")
def actualizar_renta(
    id_renta: int,
    datos: RentaActualizar,
    db: Session = Depends(get_db),
):
    renta = db.query(Renta).filter(Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(status_code=404, detail="Renta no encontrada")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(renta, campo, valor)
    db.commit()
    db.refresh(renta)
    return {"mensaje": "Renta actualizada"}


@router.delete("/{id_renta}", status_code=204)
def eliminar_renta(id_renta: int, db: Session = Depends(get_db)):
    renta = db.query(Renta).filter(Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(status_code=404, detail="Renta no encontrada")
    db.query(DetalleRenta).filter(DetalleRenta.id_renta == id_renta).delete()
    db.delete(renta)
    db.commit()