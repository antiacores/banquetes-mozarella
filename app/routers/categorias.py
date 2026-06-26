from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.categoria import CategoriaCrear, CategoriaActualizar, CategoriaRespuesta

router = APIRouter(prefix="/categorias", tags=["Categorías"])

@router.get("/", response_model=list[CategoriaRespuesta])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()

@router.get("/{id_categoria}", response_model=CategoriaRespuesta)
def obtener_categoria(id_categoria: int, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(
        models.Categoria.id_categoria == id_categoria
    ).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return categoria

@router.post("/", response_model=CategoriaRespuesta, status_code=201)
def crear_categoria(datos: CategoriaCrear, db: Session = Depends(get_db)):
    existente = db.query(models.Categoria).filter(
        models.Categoria.nombre == datos.nombre
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")

    nueva = models.Categoria(**datos.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.put("/{id_categoria}", response_model=CategoriaRespuesta)
def actualizar_categoria(id_categoria: int, datos: CategoriaActualizar, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(
        models.Categoria.id_categoria == id_categoria
    ).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(categoria, campo, valor)

    db.commit()
    db.refresh(categoria)
    return categoria

@router.delete("/{id_categoria}", status_code=204)
def eliminar_categoria(id_categoria: int, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(
        models.Categoria.id_categoria == id_categoria
    ).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    tiene_articulos = db.query(models.Articulo).filter(
        models.Articulo.id_categoria == id_categoria
    ).first()
    if tiene_articulos:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay artículos registrados en esta categoría"
        )

    db.delete(categoria)
    db.commit()