-- Descripción: Creación del esquema completo de la base de datos

-- 1. USUARIOS DEL SISTEMA
-- Perfiles: 'jefe' (acceso total) y 'almacen' (acceso operativo)
CREATE TABLE IF NOT EXISTS Usuario (
    id_usuario     SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(100) NOT NULL UNIQUE,
    contrasena     VARCHAR(255) NOT NULL,
    perfil         VARCHAR(20)  NOT NULL CHECK (perfil IN ('jefe', 'almacen')),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 2. CATEGORÍA
-- Clasifica los artículos: mobiliario, cristalería, vajilla, etc.
CREATE TABLE IF NOT EXISTS Categoria (
    id_categoria   SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    descripcion    VARCHAR(200)
);

-- 3. ARTÍCULO
-- Cada pieza del inventario. Incluye cantidad mínima para alertas.
CREATE TABLE IF NOT EXISTS Articulo (
    id_articulo         SERIAL PRIMARY KEY,
    id_categoria        INT          NOT NULL REFERENCES Categoria(id_categoria),
    nombre              VARCHAR(100) NOT NULL,
    cantidad_total      INT          NOT NULL DEFAULT 0 CHECK (cantidad_total >= 0),
    cantidad_disponible INT          NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
    cantidad_minima     INT          NOT NULL DEFAULT 0,
    costo_unitario      NUMERIC(10,2),
    estado              VARCHAR(20)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    observaciones       VARCHAR(200)
);

-- 4. COMPONENTE DE ARTÍCULO
-- Para carpas y estructuras compuestas por varias piezas.
-- Cada pieza hija es un Articulo independiente agrupado aquí.
-- Ejemplo: "Carpa 10x20" (padre) -> "Poste lateral" (hijo)
CREATE TABLE IF NOT EXISTS ComponenteArticulo (
    id_componente      SERIAL PRIMARY KEY,
    id_articulo_padre  INT NOT NULL REFERENCES Articulo(id_articulo),
    id_articulo_hijo   INT NOT NULL REFERENCES Articulo(id_articulo),
    descripcion        VARCHAR(200),
    UNIQUE (id_articulo_padre, id_articulo_hijo)
);

-- 5. EVENTO
-- Registro de cada evento:
-- se usa nombre_cliente como campo de texto libre.
CREATE TABLE IF NOT EXISTS Evento (
    id_evento       SERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(150),
    fecha           DATE         NOT NULL,
    tipo            VARCHAR(50)  NOT NULL,
    lugar           VARCHAR(100),
    num_invitados   INT          CHECK (num_invitados >= 0),
    estado          VARCHAR(20)  NOT NULL DEFAULT 'cotizacion'
                    CHECK (estado IN ('cotizacion', 'pendiente', 'confirmado', 'finalizado', 'cancelado')),
    observaciones   VARCHAR(300),
    creado_en       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 6. DETALLE DE EVENTO
-- Tabla pivote: qué artículos se asignan a cada evento,
-- en qué cantidad y cuántos regresaron.
CREATE TABLE IF NOT EXISTS DetalleEvento (
    id_detalle          SERIAL PRIMARY KEY,
    id_evento           INT NOT NULL REFERENCES Evento(id_evento),
    id_articulo         INT NOT NULL REFERENCES Articulo(id_articulo),
    cantidad_asignada   INT NOT NULL CHECK (cantidad_asignada > 0),
    cantidad_devuelta   INT          DEFAULT 0 CHECK (cantidad_devuelta >= 0),
    observaciones       VARCHAR(200),
    UNIQUE (id_evento, id_articulo)
);

-- 7. BAJA DE INVENTARIO
-- Registro de cada artículo dado de baja: roto, perdido, desgaste.
-- Vinculado al artículo y al evento donde ocurrió.
CREATE TABLE IF NOT EXISTS BajaInventario (
    id_baja       SERIAL PRIMARY KEY,
    id_articulo   INT          NOT NULL REFERENCES Articulo(id_articulo),
    id_evento     INT          REFERENCES Evento(id_evento),
    cantidad      INT          NOT NULL CHECK (cantidad > 0),
    motivo        VARCHAR(50)  NOT NULL CHECK (motivo IN ('roto', 'perdido', 'desgaste', 'otro')),
    descripcion   VARCHAR(200),
    fecha         DATE         NOT NULL DEFAULT CURRENT_DATE,
    registrado_por INT         REFERENCES Usuario(id_usuario)
);

-- 8. PROVEEDOR
-- Empresas o personas de quienes se repone el inventario.
CREATE TABLE IF NOT EXISTS Proveedor (
    id_proveedor  SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    telefono      VARCHAR(20),
    correo        VARCHAR(100),
    notas         VARCHAR(200)
);

-- 9. REPOSICIÓN
-- Cuándo se compró stock, a quién y cuánto costó.
CREATE TABLE IF NOT EXISTS Reposicion (
    id_reposicion  SERIAL PRIMARY KEY,
    id_articulo    INT          NOT NULL REFERENCES Articulo(id_articulo),
    id_proveedor   INT          NOT NULL REFERENCES Proveedor(id_proveedor),
    fecha          DATE         NOT NULL DEFAULT CURRENT_DATE,
    cantidad       INT          NOT NULL CHECK (cantidad > 0),
    costo_total    NUMERIC(10,2),
    notas          VARCHAR(200)
);