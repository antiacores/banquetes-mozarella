from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, Date, DateTime, Text,
    ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String(100), nullable=False)
    correo     = Column(String(100), nullable=False, unique=True)
    contrasena = Column(String(255), nullable=False)
    perfil     = Column(String(20), nullable=False)  # 'jefe' o 'almacen'
    activo     = Column(Boolean, nullable=False, default=True)
    creado_en  = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("perfil IN ('jefe', 'almacen')", name="ck_usuario_perfil"),
    )


class Categoria(Base):
    __tablename__ = "categoria"

    id_categoria = Column(Integer, primary_key=True, index=True)
    nombre       = Column(String(100), nullable=False, unique=True)
    descripcion  = Column(String(200))

    articulos = relationship("Articulo", back_populates="categoria")


class Articulo(Base):
    __tablename__ = "articulo"

    id_articulo         = Column(Integer, primary_key=True, index=True)
    id_categoria        = Column(Integer, ForeignKey("categoria.id_categoria"), nullable=False)
    nombre              = Column(String(100), nullable=False)
    cantidad_total      = Column(Integer, nullable=False, default=0)
    cantidad_disponible = Column(Integer, nullable=False, default=0)
    cantidad_minima     = Column(Integer, nullable=False, default=0)
    costo_unitario      = Column(Numeric(10, 2))
    estado              = Column(String(20), nullable=False, default="activo")
    observaciones       = Column(String(200))
    imagen_url          = Column(String(500), nullable=True)

    categoria = relationship("Categoria", back_populates="articulos")

    __table_args__ = (
        CheckConstraint("cantidad_total >= 0",      name="ck_articulo_total_positivo"),
        CheckConstraint("cantidad_disponible >= 0", name="ck_articulo_disponible_positivo"),
        CheckConstraint("estado IN ('activo', 'inactivo')", name="ck_articulo_estado"),
    )


class ComponenteArticulo(Base):
    __tablename__ = "componentearticulo"

    id_componente      = Column(Integer, primary_key=True, index=True)
    id_articulo_padre  = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    id_articulo_hijo   = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    descripcion        = Column(String(200))

    __table_args__ = (
        UniqueConstraint("id_articulo_padre", "id_articulo_hijo", name="uq_componente"),
    )


# ── NUEVO: Tabla Cliente ──────────────────────────────────────────────────

class Cliente(Base):
    __tablename__ = "cliente"

    id_cliente = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String(150), nullable=False)
    telefono   = Column(String(30))
    correo     = Column(String(100))
    direccion  = Column(String(200))
    notas      = Column(Text)
    creado_en  = Column(DateTime, server_default=func.now())

    eventos = relationship("Evento", back_populates="cliente")


# ─────────────────────────────────────────────────────────────────────────

class Evento(Base):
    __tablename__ = "evento"

    id_evento      = Column(Integer, primary_key=True, index=True)
    id_cliente     = Column(Integer, ForeignKey("cliente.id_cliente"), nullable=True)  # NUEVO
    nombre_cliente = Column(String(150))
    fecha          = Column(Date, nullable=False)
    tipo           = Column(String(50), nullable=False)
    lugar          = Column(String(100))
    num_invitados  = Column(Integer)
    estado         = Column(String(20), nullable=False, default="cotizacion")
    observaciones  = Column(String(300))
    creado_en      = Column(DateTime, server_default=func.now())

    cliente  = relationship("Cliente", back_populates="eventos")
    detalles = relationship("DetalleEvento", back_populates="evento")

    __table_args__ = (
        CheckConstraint(
            "estado IN ('cotizacion','pendiente','confirmado','finalizado','cancelado')",
            name="ck_evento_estado"
        ),
    )


class DetalleEvento(Base):
    __tablename__ = "detalleevento"

    id_detalle        = Column(Integer, primary_key=True, index=True)
    id_evento         = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    id_articulo       = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    cantidad_asignada = Column(Integer, nullable=False)
    cantidad_devuelta = Column(Integer, default=0)
    precio_override   = Column(Numeric(10, 2), nullable=True)
    observaciones     = Column(String(200))

    evento   = relationship("Evento", back_populates="detalles")
    articulo = relationship("Articulo")

    __table_args__ = (
        UniqueConstraint("id_evento", "id_articulo", name="uq_detalle_evento_articulo"),
        CheckConstraint("cantidad_asignada > 0", name="ck_detalle_cantidad_positiva"),
    )


class BajaInventario(Base):
    __tablename__ = "bajainventario"

    id_baja               = Column(Integer, primary_key=True, index=True)
    id_articulo           = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    id_evento             = Column(Integer, ForeignKey("evento.id_evento"), nullable=True)
    cantidad              = Column(Integer, nullable=False)
    motivo                = Column(String(50), nullable=False)
    descripcion           = Column(String(200))
    fecha                 = Column(Date, server_default=func.current_date())
    registrado_por        = Column(Integer, ForeignKey("usuario.id_usuario"))
    nombre_trabajador     = Column(String(100))          # NUEVO
    estado_autorizacion   = Column(String(20), default="aprobada")  # NUEVO: pendiente/aprobada/rechazada
    notas_jefe            = Column(Text)                 # NUEVO

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_baja_cantidad_positiva"),
        CheckConstraint(
            "motivo IN ('roto','perdido','desgaste','otro')", name="ck_baja_motivo"
        ),
    )


class Proveedor(Base):
    __tablename__ = "proveedor"

    id_proveedor = Column(Integer, primary_key=True, index=True)
    nombre       = Column(String(100), nullable=False)
    telefono     = Column(String(20))
    correo       = Column(String(100))
    notas        = Column(String(200))


class Reposicion(Base):
    __tablename__ = "reposicion"

    id_reposicion = Column(Integer, primary_key=True, index=True)
    id_articulo   = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    id_proveedor  = Column(Integer, ForeignKey("proveedor.id_proveedor"), nullable=False)
    fecha         = Column(Date, server_default=func.current_date())
    cantidad      = Column(Integer, nullable=False)
    costo_total   = Column(Numeric(10, 2))
    notas         = Column(String(200))

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_reposicion_cantidad_positiva"),
    )


# ── Rentas (definidas en router pero también como modelo) ─────────────────

class Renta(Base):
    __tablename__ = "renta"

    id_renta        = Column(Integer, primary_key=True, index=True)
    id_cliente      = Column(Integer, ForeignKey("cliente.id_cliente"), nullable=True)  # NUEVO
    nombre_cliente  = Column(String(150), nullable=False)
    telefono        = Column(String(30))
    fecha_entrega   = Column(Date, nullable=False)
    fecha_devolucion = Column(Date)
    estado          = Column(String(20), nullable=False, default="cotizacion")
    notas           = Column(Text)
    creado_en       = Column(DateTime, server_default=func.now())

    detalles = relationship("DetalleRenta", back_populates="renta")


class DetalleRenta(Base):
    __tablename__ = "detallerenta"

    id_detalle_renta = Column(Integer, primary_key=True, index=True)
    id_renta         = Column(Integer, ForeignKey("renta.id_renta"), nullable=False)
    id_articulo      = Column(Integer, ForeignKey("articulo.id_articulo"), nullable=False)
    cantidad         = Column(Integer, nullable=False)
    precio_unitario  = Column(Numeric(10, 2))
    precio_override  = Column(Numeric(10, 2), nullable=True)

    renta    = relationship("Renta", back_populates="detalles")
    articulo = relationship("Articulo")