from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.database import get_db
from app import models

router = APIRouter(prefix="/detalle-evento", tags=["Detalle de Evento"])

ESTADOS_ACTIVOS = ("cotizacion", "pendiente", "confirmado")


def _mapa_apartados(db: Session, excluir_evento: int = None) -> dict:
    """
    {id_articulo: total_apartado} en una sola consulta.
    Si excluir_evento se pasa, omite ese evento del cálculo
    (útil para que un evento no se auto-alerte).
    """
    q = db.query(
        models.DetalleEvento.id_articulo,
        func.sum(models.DetalleEvento.cantidad_asignada).label("apartado")
    ).join(
        models.Evento,
        models.DetalleEvento.id_evento == models.Evento.id_evento
    ).filter(
        models.Evento.estado.in_(ESTADOS_ACTIVOS)
    )
    if excluir_evento:
        q = q.filter(models.DetalleEvento.id_evento != excluir_evento)

    return {
        fila.id_articulo: int(fila.apartado)
        for fila in q.group_by(models.DetalleEvento.id_articulo).all()
    }


# ── Schemas ──────────────────────────────────────────────────────────────

class DetalleEventoCrear(BaseModel):
    id_evento: int
    id_articulo: int
    cantidad_asignada: int = Field(gt=0)
    cantidad_devuelta: int = Field(ge=0, default=0)
    precio_override: Optional[Decimal] = None
    observaciones: Optional[str] = None


class DetalleEventoActualizar(BaseModel):
    cantidad_asignada: Optional[int] = Field(gt=0, default=None)
    cantidad_devuelta: Optional[int] = Field(ge=0, default=None)
    precio_override: Optional[Decimal] = None
    observaciones: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/evento/{id_evento}")
def listar_por_evento(id_evento: int, db: Session = Depends(get_db)):
    detalles = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento
    ).all()

    if not detalles:
        return []

    # IDs de artículos en este evento
    ids_articulos = [d.id_articulo for d in detalles]

    # Una sola consulta para todos los artículos del evento
    articulos_map = {
        a.id_articulo: a
        for a in db.query(models.Articulo).filter(
            models.Articulo.id_articulo.in_(ids_articulos)
        ).all()
    }

    # Una sola consulta para todos los apartados (excluyendo este evento)
    apartados = _mapa_apartados(db, excluir_evento=id_evento)

    resultado = []
    for d in detalles:
        art = articulos_map.get(d.id_articulo)
        cant_disp = art.cantidad_disponible if art else 0
        apartado = apartados.get(d.id_articulo, 0)
        disp_real = max(0, cant_disp - apartado)

        resultado.append({
            "id_detalle":               d.id_detalle,
            "id_evento":                d.id_evento,
            "id_articulo":              d.id_articulo,
            "nombre_articulo":          art.nombre if art else f"#{d.id_articulo}",
            "imagen_url":               art.imagen_url if art else None,
            "cantidad_asignada":        d.cantidad_asignada,
            "cantidad_devuelta":        d.cantidad_devuelta or 0,
            "cantidad_disponible_real": disp_real,
            "cantidad_disponible_bd":   cant_disp,
            "cantidad_total":           art.cantidad_total if art else 0,
            "precio_override":          float(d.precio_override) if d.precio_override else None,
            "precio_base":              float(art.costo_unitario) if art and art.costo_unitario else 0,
            "observaciones":            d.observaciones,
        })
    return resultado


@router.get("/evento/{id_evento}/alertas")
def verificar_disponibilidad(id_evento: int, db: Session = Depends(get_db)):
    detalles = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento
    ).all()

    if not detalles:
        return {"id_evento": id_evento, "alertas": []}

    ids_articulos = [d.id_articulo for d in detalles]
    articulos_map = {
        a.id_articulo: a
        for a in db.query(models.Articulo).filter(
            models.Articulo.id_articulo.in_(ids_articulos)
        ).all()
    }

    # Excluyendo este evento para no auto-alertarse
    apartados = _mapa_apartados(db, excluir_evento=id_evento)

    alertas = []
    for d in detalles:
        art = articulos_map.get(d.id_articulo)
        if not art:
            continue
        disp_real = max(0, art.cantidad_disponible - apartados.get(d.id_articulo, 0))
        if d.cantidad_asignada > disp_real:
            alertas.append({
                "id_articulo":       art.id_articulo,
                "nombre_articulo":   art.nombre,
                "cantidad_solicitada": d.cantidad_asignada,
                "cantidad_disponible": disp_real,
                "faltante":          d.cantidad_asignada - disp_real,
            })

    return {"id_evento": id_evento, "alertas": alertas}


@router.post("/", status_code=201)
def asignar_articulo(datos: DetalleEventoCrear, db: Session = Depends(get_db)):
    if not db.query(models.Evento).filter(
        models.Evento.id_evento == datos.id_evento
    ).first():
        raise HTTPException(status_code=400, detail="El evento indicado no existe")

    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == datos.id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=400, detail="El artículo indicado no existe")

    if db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == datos.id_evento,
        models.DetalleEvento.id_articulo == datos.id_articulo,
    ).first():
        raise HTTPException(
            status_code=400,
            detail="Este artículo ya está asignado. Edita la cantidad existente."
        )

    nuevo = models.DetalleEvento(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    # Calcular alerta sin bloquear
    apartados = _mapa_apartados(db, excluir_evento=datos.id_evento)
    disp = max(0, articulo.cantidad_disponible - apartados.get(datos.id_articulo, 0))
    alerta = datos.cantidad_asignada > disp

    return {
        "id_detalle":    nuevo.id_detalle,
        "alerta_stock":  alerta,
        "disponible_real": disp,
        "mensaje": (
            f"⚠️ Stock insuficiente: faltan {datos.cantidad_asignada - disp} piezas."
            if alerta else "Artículo asignado correctamente."
        ),
    }


@router.put("/{id_detalle}")
def actualizar_detalle(
    id_detalle: int,
    datos: DetalleEventoActualizar,
    db: Session = Depends(get_db),
):
    detalle = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_detalle == id_detalle
    ).first()
    if not detalle:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(detalle, campo, valor)

    db.commit()
    db.refresh(detalle)
    return {"id_detalle": detalle.id_detalle, "mensaje": "Actualizado"}


@router.delete("/{id_detalle}", status_code=204)
def eliminar_detalle(id_detalle: int, db: Session = Depends(get_db)):
    detalle = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_detalle == id_detalle
    ).first()
    if not detalle:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")
    db.delete(detalle)
    db.commit()