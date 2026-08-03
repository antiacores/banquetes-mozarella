from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app import models

router = APIRouter(prefix="/eventos", tags=["Eventos"])


class EventoCrear(BaseModel):
    nombre_cliente: Optional[str] = None
    fecha: date
    tipo: str
    lugar: Optional[str] = None
    num_invitados: Optional[int] = None
    estado: str = "cotizacion"
    observaciones: Optional[str] = None


class EventoActualizar(BaseModel):
    nombre_cliente: Optional[str] = None
    fecha: Optional[date] = None
    tipo: Optional[str] = None
    lugar: Optional[str] = None
    num_invitados: Optional[int] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None


class DevolucionItem(BaseModel):
    id_detalle: int
    id_articulo: int
    cantidad_asignada: int
    cantidad_devuelta: int
    motivo_baja: Optional[str] = None
    descripcion_baja: Optional[str] = None


class FinalizarEventoPayload(BaseModel):
    devoluciones: list[DevolucionItem]


@router.get("/")
def listar_eventos(
    estado: Optional[str] = Query(default=None),
    desde: Optional[date] = Query(default=None),
    hasta: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
):
    consulta = db.query(models.Evento)
    if estado:
        consulta = consulta.filter(models.Evento.estado == estado)
    if desde:
        consulta = consulta.filter(models.Evento.fecha >= desde)
    if hasta:
        consulta = consulta.filter(models.Evento.fecha <= hasta)
    return consulta.order_by(models.Evento.fecha).all()


@router.get("/{id_evento}")
def obtener_evento(id_evento: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento


@router.post("/", status_code=201)
def crear_evento(datos: EventoCrear, db: Session = Depends(get_db)):
    nuevo = models.Evento(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/{id_evento}")
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

    # Eliminar en orden correcto respetando FKs:
    # 1. Bajas que referencian este evento (poner id_evento en NULL)
    db.query(models.BajaInventario).filter(
        models.BajaInventario.id_evento == id_evento
    ).update({"id_evento": None})

    # 2. Detalles del evento
    db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento
    ).delete()

    # 3. El evento
    db.delete(evento)
    db.commit()


@router.post("/{id_evento}/finalizar")
def finalizar_evento(
    id_evento: int,
    payload: FinalizarEventoPayload,
    db: Session = Depends(get_db),
):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if evento.estado == "finalizado":
        raise HTTPException(status_code=400, detail="Este evento ya fue finalizado")

    bajas_registradas = []

    for item in payload.devoluciones:
        # 1. Actualizar cantidad_devuelta en DetalleEvento
        detalle = db.query(models.DetalleEvento).filter(
            models.DetalleEvento.id_detalle == item.id_detalle
        ).first()
        if detalle:
            detalle.cantidad_devuelta = item.cantidad_devuelta

        # 2. Calcular lo no devuelto
        no_devuelto = item.cantidad_asignada - item.cantidad_devuelta
        if no_devuelto <= 0:
            continue

        # 3. Registrar baja
        baja = models.BajaInventario(
            id_articulo=item.id_articulo,
            id_evento=id_evento,
            cantidad=no_devuelto,
            motivo=item.motivo_baja or "otro",
            descripcion=item.descripcion_baja or "No devuelto al finalizar evento",
        )
        db.add(baja)

        # 4. Descontar del inventario SOLO lo no devuelto
        #    (NO se toca cantidad_disponible — eso lo maneja el trigger de bajas)
        #    Solo actualizamos cantidad_total para reflejar la pérdida permanente
        articulo = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == item.id_articulo
        ).first()
        if articulo:
            articulo.cantidad_total = max(0, articulo.cantidad_total - no_devuelto)
            # cantidad_disponible la maneja el trigger trg_baja_inventario
            bajas_registradas.append({
                "articulo":    articulo.nombre,
                "no_devuelto": no_devuelto,
                "motivo":      item.motivo_baja or "otro",
            })

    evento.estado = "finalizado"
    db.commit()

    return {
        "mensaje":           "Evento finalizado correctamente",
        "bajas_registradas": bajas_registradas,
        "total_bajas":       len(bajas_registradas),
    }