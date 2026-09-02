from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date
from app.database import get_db
from app import models
from app.routers.auth import obtener_usuario_actual, UsuarioActual

router = APIRouter(prefix="/bajas", tags=["Bajas de Inventario"])


class BajaCrear(BaseModel):
    id_articulo:      int
    id_evento:        Optional[int] = None
    cantidad:         int
    motivo:           str  # roto, perdido, desgaste, otro
    descripcion:      Optional[str] = None
    nombre_trabajador: Optional[str] = None  # obligatorio para almacén


class AutorizarBaja(BaseModel):
    accion:      str  # 'aprobar' o 'rechazar'
    notas_jefe:  Optional[str] = None


@router.get("/")
def listar_bajas(
    estado: Optional[str] = Query(default=None),  # pendiente, aprobada, rechazada
    db: Session = Depends(get_db),
):
    consulta = db.query(models.BajaInventario)
    if estado:
        consulta = consulta.filter(
            models.BajaInventario.estado_autorizacion == estado
        )
    bajas = consulta.order_by(models.BajaInventario.fecha.desc()).all()

    resultado = []
    for b in bajas:
        art = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == b.id_articulo
        ).first()
        resultado.append({
            "id_baja":              b.id_baja,
            "id_articulo":          b.id_articulo,
            "nombre_articulo":      art.nombre if art else f"#{b.id_articulo}",
            "id_evento":            b.id_evento,
            "cantidad":             b.cantidad,
            "motivo":               b.motivo,
            "descripcion":          b.descripcion,
            "fecha":                b.fecha,
            "nombre_trabajador":    b.nombre_trabajador,
            "estado_autorizacion":  b.estado_autorizacion or "aprobada",
            "notas_jefe":           b.notas_jefe,
        })
    return resultado


@router.post("/", status_code=201)
def registrar_baja(
    datos: BajaCrear,
    usuario: UsuarioActual = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == datos.id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=400, detail="El artículo no existe")

    # Almacén debe poner su nombre
    if usuario.perfil == "almacen" and not datos.nombre_trabajador:
        raise HTTPException(
            status_code=400,
            detail="El trabajador debe escribir su nombre para registrar una baja"
        )

    # Estado según perfil: jefe aprueba directo, almacén queda pendiente
    if usuario.perfil == "jefe":
        estado = "aprobada"
        # Jefe: descontar inventario inmediatamente
        articulo.cantidad_total      = max(0, articulo.cantidad_total - datos.cantidad)
        articulo.cantidad_disponible = max(0, articulo.cantidad_disponible - datos.cantidad)
    else:
        estado = "pendiente"
        # Almacén: NO descontar todavía, esperar aprobación del jefe

    nueva = models.BajaInventario(
        id_articulo=datos.id_articulo,
        id_evento=datos.id_evento,
        cantidad=datos.cantidad,
        motivo=datos.motivo,
        descripcion=datos.descripcion,
        nombre_trabajador=datos.nombre_trabajador or usuario.nombre,
        estado_autorizacion=estado,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return {
        "id_baja":             nueva.id_baja,
        "estado_autorizacion": nueva.estado_autorizacion,
        "mensaje": "Baja registrada y aprobada." if estado == "aprobada"
                   else "Baja registrada. Pendiente de autorización del jefe.",
    }


@router.put("/{id_baja}/autorizar")
def autorizar_baja(
    id_baja: int,
    datos: AutorizarBaja,
    usuario: UsuarioActual = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Solo el jefe puede aprobar o rechazar bajas pendientes."""
    if usuario.perfil != "jefe":
        raise HTTPException(status_code=403, detail="Solo el administrador puede autorizar bajas")

    baja = db.query(models.BajaInventario).filter(
        models.BajaInventario.id_baja == id_baja
    ).first()
    if not baja:
        raise HTTPException(status_code=404, detail="Baja no encontrada")

    if baja.estado_autorizacion != "pendiente":
        raise HTTPException(status_code=400, detail="Esta baja ya fue procesada")

    if datos.accion == "aprobar":
        baja.estado_autorizacion = "aprobada"
        baja.notas_jefe = datos.notas_jefe
        # Descontar inventario ahora que el jefe aprobó
        articulo = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == baja.id_articulo
        ).first()
        if articulo:
            articulo.cantidad_total      = max(0, articulo.cantidad_total - baja.cantidad)
            articulo.cantidad_disponible = max(0, articulo.cantidad_disponible - baja.cantidad)
        mensaje = "Baja aprobada e inventario actualizado."

    elif datos.accion == "rechazar":
        baja.estado_autorizacion = "rechazada"
        baja.notas_jefe = datos.notas_jefe
        mensaje = "Baja rechazada. El inventario no fue modificado."

    else:
        raise HTTPException(status_code=400, detail="Acción inválida. Usa 'aprobar' o 'rechazar'")

    db.commit()
    return {"id_baja": baja.id_baja, "estado_autorizacion": baja.estado_autorizacion, "mensaje": mensaje}


@router.delete("/{id_baja}", status_code=204)
def eliminar_baja(
    id_baja: int,
    usuario: UsuarioActual = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    if usuario.perfil != "jefe":
        raise HTTPException(status_code=403, detail="Solo el administrador puede eliminar bajas")

    baja = db.query(models.BajaInventario).filter(
        models.BajaInventario.id_baja == id_baja
    ).first()
    if not baja:
        raise HTTPException(status_code=404, detail="Baja no encontrada")

    # Solo revertir inventario si estaba aprobada
    if baja.estado_autorizacion == "aprobada":
        articulo = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == baja.id_articulo
        ).first()
        if articulo:
            articulo.cantidad_total      += baja.cantidad
            articulo.cantidad_disponible += baja.cantidad

    db.delete(baja)
    db.commit()