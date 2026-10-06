from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Date, Numeric, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.database import get_db
from app import models

router = APIRouter(prefix="/rentas", tags=["Rentas"])

Base = declarative_base()

# ── Modelos SQLAlchemy ────────────────────────────────────────────────────────

class Renta(Base):
    __tablename__ = "renta"
    id_renta         = Column(Integer, primary_key=True, index=True)
    nombre_cliente   = Column(String(150), nullable=False)
    telefono         = Column(String(20))
    fecha_entrega    = Column(Date, nullable=False)
    fecha_devolucion = Column(Date)
    estado           = Column(String(30), default="cotizacion")
    notas            = Column(Text)

class DetalleRenta(Base):
    __tablename__ = "detallerenta"
    id_detalle_renta = Column(Integer, primary_key=True, index=True)
    id_renta         = Column(Integer, ForeignKey("renta.id_renta"), nullable=False)
    id_articulo      = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    cantidad         = Column(Integer, nullable=False)
    precio_unitario  = Column(Numeric(10, 2), default=0)

# ── Schemas Pydantic ──────────────────────────────────────────────────────────

class ArticuloRentaEntrada(BaseModel):
    id_articulo:     int
    cantidad:        int
    precio_unitario: float = 0.0

class RentaCrear(BaseModel):
    nombre_cliente:   str
    telefono:         Optional[str] = None
    fecha_entrega:    date
    fecha_devolucion: Optional[date] = None
    estado:           str = "cotizacion"
    notas:            Optional[str] = None
    articulos:        list[ArticuloRentaEntrada]

class RentaActualizar(BaseModel):
    nombre_cliente:   Optional[str]  = None
    telefono:         Optional[str]  = None
    fecha_entrega:    Optional[date] = None
    fecha_devolucion: Optional[date] = None
    estado:           Optional[str]  = None
    notas:            Optional[str]  = None
    # Si se envía esta lista, se reemplaza el detalle completo.
    # Si NO se envía (None), sólo se actualizan los campos generales.
    articulos:        Optional[list[ArticuloRentaEntrada]] = None

class ArticuloRentaRespuesta(BaseModel):
    id_detalle_renta: int
    id_articulo:      int
    nombre_articulo:  str
    cantidad:         int
    precio_unitario:  float

    model_config = {"from_attributes": True}

class RentaRespuesta(BaseModel):
    id_renta:         int
    nombre_cliente:   str
    telefono:         Optional[str]
    fecha_entrega:    date
    fecha_devolucion: Optional[date]
    estado:           str
    notas:            Optional[str]
    total:            float
    articulos:        list[ArticuloRentaRespuesta] = []

    model_config = {"from_attributes": True}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_respuesta(renta, db: Session) -> dict:
    detalles = db.query(models.DetalleRenta).filter(
        models.DetalleRenta.id_renta == renta.id_renta
    ).all()

    articulos_resp = []
    total = 0.0
    for d in detalles:
        art = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == d.id_articulo
        ).first()
        precio = float(d.precio_unitario) if d.precio_unitario else 0.0
        subtotal = precio * d.cantidad
        total += subtotal
        articulos_resp.append({
            "id_detalle_renta": d.id_detalle_renta,
            "id_articulo":      d.id_articulo,
            "nombre_articulo":  art.nombre if art else "—",
            "cantidad":         d.cantidad,
            "precio_unitario":  precio,
        })

    return {
        "id_renta":         renta.id_renta,
        "nombre_cliente":   renta.nombre_cliente,
        "telefono":         renta.telefono,
        "fecha_entrega":    renta.fecha_entrega,
        "fecha_devolucion": renta.fecha_devolucion,
        "estado":           renta.estado,
        "notas":            renta.notas,
        "total":            total,
        "articulos":        articulos_resp,
    }

def _reemplazar_articulos(id_renta: int, articulos: list[ArticuloRentaEntrada], db: Session):
    """Borra los DetalleRenta actuales y crea los nuevos."""
    db.query(models.DetalleRenta).filter(
        models.DetalleRenta.id_renta == id_renta
    ).delete()

    for a in articulos:
        nuevo = models.DetalleRenta(
            id_renta=id_renta,
            id_articulo=a.id_articulo,
            cantidad=a.cantidad,
            precio_unitario=a.precio_unitario,
        )
        db.add(nuevo)

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[RentaRespuesta])
def listar_rentas(db: Session = Depends(get_db)):
    rentas = db.query(models.Renta).order_by(models.Renta.fecha_entrega.desc()).all()
    return [_build_respuesta(r, db) for r in rentas]


@router.get("/{id_renta}", response_model=RentaRespuesta)
def obtener_renta(id_renta: int, db: Session = Depends(get_db)):
    renta = db.query(models.Renta).filter(models.Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(status_code=404, detail="Renta no encontrada")
    return _build_respuesta(renta, db)


@router.post("/", response_model=RentaRespuesta, status_code=201)
def crear_renta(datos: RentaCrear, db: Session = Depends(get_db)):
    if not datos.articulos:
        raise HTTPException(status_code=400, detail="Debes incluir al menos un artículo.")

    nueva = models.Renta(
        nombre_cliente=datos.nombre_cliente,
        telefono=datos.telefono,
        fecha_entrega=datos.fecha_entrega,
        fecha_devolucion=datos.fecha_devolucion,
        estado=datos.estado,
        notas=datos.notas,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    _reemplazar_articulos(nueva.id_renta, datos.articulos, db)
    db.commit()

    return _build_respuesta(nueva, db)


@router.put("/{id_renta}", response_model=RentaRespuesta)
def actualizar_renta(id_renta: int, datos: RentaActualizar, db: Session = Depends(get_db)):
    renta = db.query(models.Renta).filter(models.Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(status_code=404, detail="Renta no encontrada")

    # Actualizar campos generales (solo los que vienen en el body)
    campos = datos.model_dump(exclude_unset=True, exclude={"articulos"})
    for campo, valor in campos.items():
        setattr(renta, campo, valor)

    # Si vienen artículos, reemplazar el detalle completo
    if datos.articulos is not None:
        if len(datos.articulos) == 0:
            raise HTTPException(
                status_code=400,
                detail="La lista de artículos no puede estar vacía."
            )
        _reemplazar_articulos(id_renta, datos.articulos, db)

    db.commit()
    db.refresh(renta)
    return _build_respuesta(renta, db)


@router.delete("/{id_renta}", status_code=204)
def eliminar_renta(id_renta: int, db: Session = Depends(get_db)):
    renta = db.query(models.Renta).filter(models.Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(status_code=404, detail="Renta no encontrada")

    db.query(models.DetalleRenta).filter(
        models.DetalleRenta.id_renta == id_renta
    ).delete()
    db.delete(renta)
    db.commit()