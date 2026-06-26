from pydantic import BaseModel, Field
from typing import Optional

class DetalleEventoBase(BaseModel):
    id_evento: int
    id_articulo: int
    cantidad_asignada: int = Field(gt=0)
    cantidad_devuelta: int = Field(ge=0, default=0)
    observaciones: Optional[str] = None

class DetalleEventoCrear(DetalleEventoBase):
    pass

class DetalleEventoActualizar(BaseModel):
    cantidad_asignada: Optional[int] = Field(gt=0, default=None)
    cantidad_devuelta: Optional[int] = Field(ge=0, default=None)
    observaciones: Optional[str] = None

class DetalleEventoRespuesta(DetalleEventoBase):
    id_detalle: int

    class Config:
        from_attributes = True

class AlertaDisponibilidad(BaseModel):
    """Se devuelve cuando se intenta asignar más de lo disponible."""
    id_articulo: int
    nombre_articulo: str
    cantidad_solicitada: int
    cantidad_disponible: int
    faltante: int