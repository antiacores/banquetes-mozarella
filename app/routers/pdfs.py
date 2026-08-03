from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
import io, base64, tempfile, os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas

MESES_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
}
 
def fecha_es(d) -> str:
    """Convierte un objeto date a '25 de julio de 2026' en español."""
    if not d:
        return ""
    return f"{d.day} de {MESES_ES[d.month]} de {d.year}"

router = APIRouter(prefix="/pdf", tags=["PDFs"])

LOGO_B64 = "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"

BEIGE  = colors.HexColor("#d6d2c8")
OSCURO = colors.HexColor("#4a4540")
NEGRO  = colors.HexColor("#1a1a1a")
GRIS_T = colors.HexColor("#888880")
ORO    = colors.HexColor("#b5912b")
BLANCO = colors.white


def _logo_path():
    """Decodifica el logo base64 a un archivo temporal y devuelve la ruta."""
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp.write(base64.b64decode(LOGO_B64))
    tmp.close()
    return tmp.name


def _header(c, W, H, nombre, fecha, titulo=None):
    c.setFillColor(BEIGE)
    c.rect(0, H - 3.8*cm, 8*cm, 3.8*cm, fill=1, stroke=0)
    logo = _logo_path()
    try:
        c.drawImage(logo, 0.5*cm, H - 3.4*cm,
                    width=6.5*cm, height=2.9*cm,
                    preserveAspectRatio=True, mask="auto")
    finally:
        os.unlink(logo)
    c.setFillColor(NEGRO)
    if titulo:
        c.setFont("Helvetica-Bold", 18)
        c.drawRightString(W - 2*cm, H - 1.5*cm, titulo)
        c.setFont("Helvetica", 11)
        c.drawRightString(W - 2*cm, H - 2.3*cm, nombre)
        c.drawRightString(W - 2*cm, H - 3.0*cm, fecha)
    else:
        c.setFont("Helvetica", 10)
        c.drawRightString(W - 2*cm, H - 1.8*cm, nombre)
        c.drawRightString(W - 2*cm, H - 2.7*cm, fecha)


def _footer(c, W, con_correos=False):
    c.setFillColor(BEIGE)
    c.rect(0, 0, W * 0.42, 1.8*cm, fill=1, stroke=0)
    c.setFillColor(OSCURO)
    c.rect(W * 0.58, 0, W * 0.42, 1.8*cm, fill=1, stroke=0)
    c.setFillColor(NEGRO)
    c.setFont("Helvetica", 8.5)
    if con_correos:
        c.drawString(1.2*cm, 0.9*cm, "228-848-0489")
        c.setFillColor(BLANCO)
        c.setFont("Helvetica", 8)
        c.drawRightString(W - 0.8*cm, 0.85*cm, "info@eventosmozzarella.com")
    else:
        c.drawString(1.2*cm, 1.0*cm, "222 584 4504   -   2211705890")
        c.setFillColor(BLANCO)
        c.setFont("Helvetica", 7.5)
        c.drawRightString(W - 0.8*cm, 1.3*cm, "www.eventosmozzarella.com")
        c.drawRightString(W - 0.8*cm, 0.8*cm, "info@eventosmozzarella.com")
        c.drawRightString(W - 0.8*cm, 0.3*cm, "admin@eventosmozzarella.com")


def generar_pdf_trabajadores(nombre, fecha, articulos):
    """
    articulos: lista de dicts {nombre, cantidad_asignada}
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    W, H = letter

    _header(c, W, H, nombre, fecha)

    encabezados = [["Cant. asignada", "Artículo", "Cant. devuelta", "Observaciones"]]
    filas = [[str(a["cantidad_asignada"]), a["nombre"], "", ""] for a in articulos]
    datos = encabezados + filas

    col_w = [3.5*cm, 8*cm, 3.5*cm, 4*cm]
    row_h = [0.9*cm] + [1.5*cm] * len(filas)
    tabla = Table(datos, colWidths=col_w, rowHeights=row_h)
    tabla.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (-1,  0), "Helvetica"),
        ("FONTSIZE",  (0, 0), (-1,  0), 8),
        ("TEXTCOLOR", (0, 0), (-1,  0), GRIS_T),
        ("FONTNAME",  (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",  (0, 1), (-1, -1), 12),
        ("TEXTCOLOR", (0, 1), (-1, -1), NEGRO),
        ("ALIGN",     (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
        ("GRID",      (0, 0), (-1, -1), 0.5, colors.HexColor("#bbbbbb")),
    ]))

    tabla_w = sum(col_w)
    tabla_h = sum(row_h)
    x0 = (W - tabla_w) / 2
    y0 = H - 4.8*cm - tabla_h
    tabla.wrapOn(c, tabla_w, H)
    tabla.drawOn(c, x0, y0)

    campos = [
        "Nombre y firma de entregado:",
        "Faltantes:",
        "Comentarios o sugerencias:",
        "Nombre y firma de devolución:",
    ]
    y_f = y0 - 1.5*cm
    c.setFont("Helvetica", 9)
    c.setFillColor(NEGRO)
    for campo in campos:
        c.drawString(2*cm, y_f, campo)
        tw = c.stringWidth(campo, "Helvetica", 9)
        c.setStrokeColor(NEGRO)
        c.line(2*cm + tw + 0.3*cm, y_f - 0.1*cm, W/2 + 3*cm, y_f - 0.1*cm)
        y_f -= 1.1*cm

    _footer(c, W, con_correos=False)
    c.save()
    buf.seek(0)
    return buf


def generar_pdf_cotizacion(nombre, fecha, articulos, flete):
    """
    articulos: lista de dicts {nombre, cantidad, precio_unitario}
    flete: float
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    W, H = letter

    _header(c, W, H, nombre, fecha, titulo="Cotización")

    encabezados = [["CANTIDAD", "DESCRIPCIÓN", "PRECIO UNIT.", "PRECIO TOT."]]
    filas = []
    for a in articulos:
        total_art = a["cantidad"] * float(a["precio_unitario"])
        filas.append([
            str(a["cantidad"]),
            a["nombre"],
            f"$    {float(a['precio_unitario']):,.2f}",
            f"${total_art:,.2f}",
        ])
    total_arts = sum(a["cantidad"] * float(a["precio_unitario"]) for a in articulos)
    total_final = total_arts + float(flete)
    fila_flete = ["", "", "FLETE", f"$  {float(flete):,.2f}"]
    fila_total  = ["", "", "TOTAL", f"${total_final:,.2f}"]
    datos = encabezados + filas + [fila_flete, fila_total]

    col_w = [2.8*cm, 9*cm, 3.5*cm, 3.3*cm]
    row_h = [0.85*cm] + [0.7*cm] * len(filas) + [0.75*cm, 0.85*cm]
    n = len(datos)
    tabla = Table(datos, colWidths=col_w, rowHeights=row_h)
    tabla.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1,  0), 8.5),
        ("ALIGN",     (0, 0), (-1,  0), "CENTER"),
        ("FONTNAME",  (0, 1), (-1, n-3), "Helvetica"),
        ("FONTSIZE",  (0, 1), (-1, n-3), 9),
        ("ALIGN",     (0, 1), (0,  n-3), "CENTER"),
        ("ALIGN",     (1, 1), (1,  n-3), "CENTER"),
        ("ALIGN",     (2, 1), (3,  n-3), "RIGHT"),
        ("FONTNAME",  (2, n-2), (3, n-1), "Helvetica-Bold"),
        ("ALIGN",     (2, n-2), (3, n-1), "RIGHT"),
        ("TEXTCOLOR", (3, n-1), (3, n-1), ORO),
        ("GRID",      (0, 0), (-1, n-3), 0.5, colors.HexColor("#bbbbbb")),
        ("LINEABOVE", (2, n-2), (3, n-1), 0.5, colors.HexColor("#bbbbbb")),
        ("LINEBELOW", (2, n-2), (3, n-2), 0.5, colors.HexColor("#bbbbbb")),
        ("LINEBELOW", (2, n-1), (3, n-1), 0.5, colors.HexColor("#bbbbbb")),
        ("LINEBEFORE",(2, n-2), (2, n-1), 0.5, colors.HexColor("#bbbbbb")),
        ("LINEAFTER", (3, n-2), (3, n-1), 0.5, colors.HexColor("#bbbbbb")),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
        ("TEXTCOLOR", (0, 0), (-1, -1), NEGRO),
    ]))

    tabla_w = sum(col_w)
    tabla_h = sum(row_h)
    x0 = (W - tabla_w) / 2
    y0 = H - 5*cm - tabla_h
    tabla.wrapOn(c, tabla_w, H)
    tabla.drawOn(c, x0, y0)

    _footer(c, W, con_correos=True)
    c.save()
    buf.seek(0)
    return buf


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/evento/{id_evento}/trabajadores")
def pdf_evento_trabajadores(id_evento: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(404, "Evento no encontrado")
    detalles = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento).all()
    articulos = []
    for d in detalles:
        art = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == d.id_articulo).first()
        articulos.append({"nombre": art.nombre if art else f"#{d.id_articulo}",
                          "cantidad_asignada": d.cantidad_asignada})
    from datetime import date
    fecha_fmt = fecha_es(evento.fecha)
    buf = generar_pdf_trabajadores(evento.nombre_cliente or "Sin nombre", fecha_fmt, articulos)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=evento_{id_evento}_trabajadores.pdf"})


@router.get("/evento/{id_evento}/cotizacion")
def pdf_evento_cotizacion(id_evento: int, flete: float = 0, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter(models.Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(404, "Evento no encontrado")

    detalles = db.query(models.DetalleEvento).filter(
        models.DetalleEvento.id_evento == id_evento
    ).all()

    articulos = []
    for d in detalles:
        art = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == d.id_articulo
        ).first()

        # Usar precio_override si existe, sino precio base del inventario
        if d.precio_override is not None:
            precio = float(d.precio_override)
        elif art and art.costo_unitario:
            precio = float(art.costo_unitario)
        else:
            precio = 0.0

        articulos.append({
            "nombre": art.nombre if art else f"#{d.id_articulo}",
            "cantidad": d.cantidad_asignada,
            "precio_unitario": precio,
        })

    from datetime import date
    fecha_fmt = fecha_es(evento.fecha)
    buf = generar_pdf_cotizacion(evento.nombre_cliente or "Sin nombre", fecha_fmt, articulos, flete)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=evento_{id_evento}_cotizacion.pdf"})


@router.get("/renta/{id_renta}/trabajadores")
def pdf_renta_trabajadores(id_renta: int, db: Session = Depends(get_db)):
    from app.routers.rentas import Renta, DetalleRenta
    renta = db.query(Renta).filter(Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(404, "Renta no encontrada")
    detalles = db.query(DetalleRenta).filter(DetalleRenta.id_renta == id_renta).all()
    articulos = []
    for d in detalles:
        art = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == d.id_articulo).first()
        articulos.append({"nombre": art.nombre if art else f"#{d.id_articulo}",
                          "cantidad_asignada": d.cantidad})
    fecha_fmt = fecha_es(renta.fecha_entrega)
    buf = generar_pdf_trabajadores(renta.nombre_cliente, fecha_fmt, articulos)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=renta_{id_renta}_trabajadores.pdf"})


@router.get("/renta/{id_renta}/cotizacion")
def pdf_renta_cotizacion(id_renta: int, flete: float = 0, db: Session = Depends(get_db)):
    from app.routers.rentas import Renta, DetalleRenta
    renta = db.query(Renta).filter(Renta.id_renta == id_renta).first()
    if not renta:
        raise HTTPException(404, "Renta no encontrada")
    detalles = db.query(DetalleRenta).filter(DetalleRenta.id_renta == id_renta).all()
    articulos = []
    for d in detalles:
        art = db.query(models.Articulo).filter(
            models.Articulo.id_articulo == d.id_articulo).first()
        articulos.append({
            "nombre": art.nombre if art else f"#{d.id_articulo}",
            "cantidad": d.cantidad,
            "precio_unitario": float(d.precio_unitario or 0),
        })
    fecha_fmt = fecha_es(renta.fecha_entrega)
    buf = generar_pdf_cotizacion(renta.nombre_cliente, fecha_fmt, articulos, flete)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=renta_{id_renta}_cotizacion.pdf"})