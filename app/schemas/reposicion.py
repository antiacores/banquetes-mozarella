from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import date

class ReposicionBase(BaseModel):
    id_articulo: int
    id_proveedor: int
    fecha: Optional[date] = None
    cantidad: int = Field(gt=0)
    costo_total: Optional[Decimal] = None
    notas: Optional[str] = None

class ReposicionCrear(ReposicionBase):
    pass

class ReposicionRespuesta(ReposicionBase):
    id_reposicion: int

    class Config:
        from_attributes = True