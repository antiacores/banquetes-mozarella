from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/resumen")
def resumen_dashboard(db: Session = Depends(get_db)):
    """
    Entrega todos los KPIs del dashboard en una sola llamada,
    usando las vistas creadas en database/04_vistas_kpi.sql
    """
    total_inventario = db.execute(text("SELECT * FROM vw_total_inventario")).mappings().first()

    eventos_mes = db.execute(
        text("SELECT COUNT(*) AS total FROM Evento "
             "WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)")
    ).mappings().first()

    bajo_stock = db.execute(text("SELECT * FROM vw_articulos_bajo_stock")).mappings().all()

    top10 = db.execute(text("SELECT * FROM vw_top10_articulos")).mappings().all()

    disponibilidad = db.execute(text("SELECT * FROM vw_disponibilidad_categoria")).mappings().all()

    alertas = db.execute(text("SELECT * FROM vw_alertas_disponibilidad")).mappings().all()

    return {
        "total_inventario": dict(total_inventario) if total_inventario else None,
        "eventos_este_mes": eventos_mes["total"] if eventos_mes else 0,
        "articulos_bajo_stock": [dict(r) for r in bajo_stock],
        "top10_articulos": [dict(r) for r in top10],
        "disponibilidad_por_categoria": [dict(r) for r in disponibilidad],
        "alertas_disponibilidad": [dict(r) for r in alertas],
    }

@router.get("/proximos-eventos")
def proximos_eventos(db: Session = Depends(get_db), limite: int = 10):
    resultados = db.execute(
        text(
            "SELECT id_evento, nombre_cliente, fecha, tipo, lugar, num_invitados, estado "
            "FROM Evento WHERE fecha >= CURRENT_DATE AND estado != 'cancelado' "
            "ORDER BY fecha ASC LIMIT :limite"
        ),
        {"limite": limite},
    ).mappings().all()
    return [dict(r) for r in resultados]