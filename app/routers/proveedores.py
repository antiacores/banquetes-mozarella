from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.proveedor import ProveedorCrear, ProveedorActualizar, ProveedorRespuesta

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

@router.get("/", response_model=list[ProveedorRespuesta])
def listar_proveedores(db: Session = Depends(get_db)):
    return db.query(models.Proveedor).all()

@router.get("/{id_proveedor}", response_model=ProveedorRespuesta)
def obtener_proveedor(id_proveedor: int, db: Session = Depends(get_db)):
    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id_proveedor == id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor

@router.post("/", response_model=ProveedorRespuesta, status_code=201)
def crear_proveedor(datos: ProveedorCrear, db: Session = Depends(get_db)):
    nuevo = models.Proveedor(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.put("/{id_proveedor}", response_model=ProveedorRespuesta)
def actualizar_proveedor(id_proveedor: int, datos: ProveedorActualizar, db: Session = Depends(get_db)):
    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id_proveedor == id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(proveedor, campo, valor)

    db.commit()
    db.refresh(proveedor)
    return proveedor

@router.delete("/{id_proveedor}", status_code=204)
def eliminar_proveedor(id_proveedor: int, db: Session = Depends(get_db)):
    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id_proveedor == id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    tiene_reposiciones = db.query(models.Reposicion).filter(
        models.Reposicion.id_proveedor == id_proveedor
    ).first()
    if tiene_reposiciones:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: el proveedor tiene reposiciones registradas"
        )

    db.delete(proveedor)
    db.commit()