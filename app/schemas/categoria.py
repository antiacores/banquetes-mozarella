from pydantic import BaseModel
from typing import Optional

class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class CategoriaCrear(CategoriaBase):
    pass

class CategoriaActualizar(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class CategoriaRespuesta(CategoriaBase):
    id_categoria: int

    class Config:
        from_attributes = True