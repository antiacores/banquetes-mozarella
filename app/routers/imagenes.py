import os
import uuid
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/imagenes", tags=["Imágenes"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = "articulos"


async def _supabase_upload(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Sube un archivo a Supabase Storage de forma asíncrona y devuelve la URL pública."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Variables SUPABASE_URL y SUPABASE_SERVICE_KEY no configuradas en .env"
        )

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.put(upload_url, content=file_bytes, headers=headers)

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=500,
            detail=f"Error al subir imagen a Supabase Storage: {response.text}"
        )

    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"


@router.post("/articulo/{id_articulo}")
async def subir_imagen_articulo(
    id_articulo: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    tipos_permitidos = {"image/jpeg", "image/png", "image/webp"}
    if archivo.content_type not in tipos_permitidos:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Usa: jpeg, png o webp"
        )

    contenido = await archivo.read()
    if len(contenido) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no debe superar 5 MB")

    extension = archivo.filename.rsplit(".", 1)[-1].lower() if "." in archivo.filename else "jpg"
    nombre_archivo = f"articulo_{id_articulo}_{uuid.uuid4().hex[:8]}.{extension}"

    url_publica = await _supabase_upload(contenido, nombre_archivo, archivo.content_type)

    articulo.imagen_url = url_publica
    db.commit()

    return {"imagen_url": url_publica, "id_articulo": id_articulo}


@router.delete("/articulo/{id_articulo}")
def eliminar_imagen_articulo(id_articulo: int, db: Session = Depends(get_db)):
    articulo = db.query(models.Articulo).filter(
        models.Articulo.id_articulo == id_articulo
    ).first()
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    articulo.imagen_url = None
    db.commit()
    return {"mensaje": "Imagen eliminada"}