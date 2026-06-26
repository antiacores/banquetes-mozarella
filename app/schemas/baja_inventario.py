from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class BajaInventarioBase(BaseModel):
    id_articulo: int
    id_evento: Optional[int] = None
    cantidad: int = Field(gt=0)
    motivo: str  # 'roto', 'perdido', 'desgaste', 'otro'
    descripcion: Optional[str] = None
    fecha: Optional[date] = None
    registrado_por: Optional[int] = None

class BajaInventarioCrear(BajaInventarioBase):
    pass

class BajaInventarioRespuesta(BajaInventarioBase):
    id_baja: int

    class Config:
        from_attributes = True