-- 1. Tabla de clientes
CREATE TABLE IF NOT EXISTS Cliente (
    id_cliente    SERIAL PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    telefono      VARCHAR(30),
    correo        VARCHAR(100),
    direccion     VARCHAR(200),
    notas         TEXT,
    creado_en     TIMESTAMP DEFAULT NOW()
);

-- 2. Conectar clientes con eventos
ALTER TABLE Evento
    ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES Cliente(id_cliente) ON DELETE SET NULL;

-- 3. Conectar clientes con rentas
ALTER TABLE Renta
    ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES Cliente(id_cliente) ON DELETE SET NULL;

-- 4. Bajas: estado de autorización y nombre del trabajador
ALTER TABLE BajaInventario
    ADD COLUMN IF NOT EXISTS estado_autorizacion VARCHAR(20) DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS nombre_trabajador   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notas_jefe          TEXT;
-- estado_autorizacion: 'pendiente', 'aprobada', 'rechazada'
-- Si el jefe registra la baja directamente → se guarda como 'aprobada'

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('cliente', 'evento', 'renta', 'bajainventario')
  AND column_name IN ('id_cliente', 'estado_autorizacion', 'nombre_trabajador', 'notas_jefe')
ORDER BY table_name, column_name;