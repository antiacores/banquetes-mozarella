from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

class ArticuloBase(BaseModel):
    id_categoria: int
    nombre: str
    cantidad_total: int = Field(ge=0, default=0)
    cantidad_disponible: int = Field(ge=0, default=0)
    cantidad_minima: int = Field(ge=0, default=0)
    costo_unitario: Optional[Decimal] = None
    estado: str = "activo"
    observaciones: Optional[str] = None
    imagen_url: Optional[str] = None

class ArticuloCrear(ArticuloBase):
    pass

class ArticuloActualizar(BaseModel):
    id_categoria: Optional[int] = None
    nombre: Optional[str] = None
    cantidad_total: Optional[int] = Field(ge=0, default=None)
    cantidad_disponible: Optional[int] = Field(ge=0, default=None)
    cantidad_minima: Optional[int] = Field(ge=0, default=None)
    costo_unitario: Optional[Decimal] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None

class ArticuloRespuesta(ArticuloBase):
    id_articulo: int

    class Config:
        from_attributes = True