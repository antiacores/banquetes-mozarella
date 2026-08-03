-- Descripción: Agrega módulo de Rentas (independiente de Eventos)

-- Tabla principal de rentas
CREATE TABLE IF NOT EXISTS Renta (
    id_renta        SERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(150) NOT NULL,
    telefono        VARCHAR(20),
    fecha_entrega   DATE         NOT NULL,
    fecha_devolucion DATE,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'cotizacion'
                    CHECK (estado IN ('cotizacion', 'confirmada', 'entregada', 'devuelta', 'cancelada')),
    notas           VARCHAR(300),
    creado_en       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Detalle: qué artículos lleva la renta y a qué precio
CREATE TABLE IF NOT EXISTS DetalleRenta (
    id_detalle_renta  SERIAL PRIMARY KEY,
    id_renta          INT          NOT NULL REFERENCES Renta(id_renta),
    id_articulo       INT          NOT NULL REFERENCES Articulo(id_articulo),
    cantidad          INT          NOT NULL CHECK (cantidad > 0),
    precio_unitario   NUMERIC(10,2) NOT NULL DEFAULT 0,
    UNIQUE (id_renta, id_articulo)
);

-- Vista: total por renta (suma precio × cantidad de todos los artículos)
CREATE OR REPLACE VIEW vw_rentas_con_total AS
SELECT
    r.id_renta,
    r.nombre_cliente,
    r.telefono,
    r.fecha_entrega,
    r.fecha_devolucion,
    r.estado,
    r.notas,
    r.creado_en,
    COALESCE(SUM(dr.cantidad * dr.precio_unitario), 0) AS total
FROM Renta r
LEFT JOIN DetalleRenta dr ON r.id_renta = dr.id_renta
GROUP BY r.id_renta, r.nombre_cliente, r.telefono, r.fecha_entrega,
         r.fecha_devolucion, r.estado, r.notas, r.creado_en;