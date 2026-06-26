from pydantic import BaseModel
from typing import Optional

class ProveedorBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    correo: Optional[str] = None
    notas: Optional[str] = None

class ProveedorCrear(ProveedorBase):
    pass

class ProveedorActualizar(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    notas: Optional[str] = None

class ProveedorRespuesta(ProveedorBase):
    id_proveedor: int

    class Config:
        from_attributes = True