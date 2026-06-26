from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class EventoBase(BaseModel):
    nombre_cliente: Optional[str] = None
    fecha: date
    tipo: str
    lugar: Optional[str] = None
    num_invitados: Optional[int] = Field(ge=0, default=None)
    estado: str = "cotizacion"
    observaciones: Optional[str] = None

class EventoCrear(EventoBase):
    pass

class EventoActualizar(BaseModel):
    nombre_cliente: Optional[str] = None
    fecha: Optional[date] = None
    tipo: Optional[str] = None
    lugar: Optional[str] = None
    num_invitados: Optional[int] = Field(ge=0, default=None)
    estado: Optional[str] = None
    observaciones: Optional[str] = None

class EventoRespuesta(EventoBase):
    id_evento: int

    class Config:
        from_attributes = True