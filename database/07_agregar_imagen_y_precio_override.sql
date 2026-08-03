-- 1. Columna de imagen en Artículo (URL pública de Supabase Storage)
ALTER TABLE Articulo
  ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);

-- 2. Precio override en DetalleEvento
--    Si es NULL → se usa costo_unitario del artículo en el PDF
--    Si tiene valor → se usa ese precio especial
ALTER TABLE DetalleEvento
  ADD COLUMN IF NOT EXISTS precio_override NUMERIC(10,2);

-- 3. Precio override en DetalleRenta
--    El precio_unitario ya existe en DetalleRenta (se captura al crear)
--    pero agregamos override igual para consistencia
ALTER TABLE DetalleRenta
  ADD COLUMN IF NOT EXISTS precio_override NUMERIC(10,2);

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('articulo', 'detalleevento', 'detallerenta')
  AND column_name IN ('imagen_url', 'precio_override')
ORDER BY table_name, column_name;