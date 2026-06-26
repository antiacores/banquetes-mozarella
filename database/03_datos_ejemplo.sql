-- Descripción: Datos de prueba para desarrollo y testing

-- Usuarios de prueba (contraseñas hasheadas con bcrypt en la app real)
INSERT INTO Usuario (nombre, correo, contrasena, perfil) VALUES
    ('Admin Prueba',   'jefe@ejemplo.com',    'HASH_AQUI', 'jefe'),
    ('Bodega Prueba',  'almacen@ejemplo.com', 'HASH_AQUI', 'almacen');

-- Categorías
INSERT INTO Categoria (nombre, descripcion) VALUES
    ('Mobiliario',   'Sillas, mesas, percheros y estructuras'),
    ('Cristalería',  'Copas, vasos, jarras'),
    ('Vajilla',      'Platos, tazas, cubiertos'),
    ('Mantelería',   'Manteles, cubre sillas, servilletas'),
    ('Decoración',   'Centros de mesa, candelabros, floreros'),
    ('Carpas',       'Estructuras y piezas de carpas');

-- Artículos de ejemplo
INSERT INTO Articulo (id_categoria, nombre, cantidad_total, cantidad_disponible, cantidad_minima, costo_unitario) VALUES
    (1, 'Silla Tiffany blanca',     200, 200, 30, 120.00),
    (1, 'Mesa redonda 1.80m',        40,  40,  8, 350.00),
    (2, 'Copa de champagne',        300, 300, 50,  25.00),
    (2, 'Copa de vino tinto',       250, 250, 50,  22.00),
    (3, 'Plato base dorado',        300, 300, 50,  35.00),
    (4, 'Mantel blanco redondo',     80,  80, 15,  80.00),
    (5, 'Centro de mesa floral',     50,  50, 10, 200.00),
    -- Artículo padre: carpa completa (no se renta sola, es un conjunto)
    (6, 'Carpa 10x20',               3,   3,  1,   0.00);

-- Componentes de la Carpa 10x20 (id_articulo = 8)
INSERT INTO Articulo (id_categoria, nombre, cantidad_total, cantidad_disponible, cantidad_minima, costo_unitario) VALUES
    (6, 'Poste lateral carpa 10x20',  24, 24, 4, 0.00),
    (6, 'Lona principal carpa 10x20',  3,  3, 1, 0.00),
    (6, 'Tensor carpa 10x20',         48, 48, 8, 0.00);

-- Relación componentes (padre = 8: Carpa 10x20)
INSERT INTO ComponenteArticulo (id_articulo_padre, id_articulo_hijo, descripcion) VALUES
    (8, 9,  'Postes laterales (8 por carpa)'),
    (8, 10, 'Lona principal (1 por carpa)'),
    (8, 11, 'Tensores (16 por carpa)');

-- Proveedor de ejemplo
INSERT INTO Proveedor (nombre, telefono, correo, notas) VALUES
    ('Distribuidora Ejemplo S.A.', '2221000000', 'contacto@ejemplo.com', 'Proveedor de cristalería y vajilla');

-- Evento de ejemplo
INSERT INTO Evento (nombre_cliente, fecha, tipo, lugar, num_invitados, estado) VALUES
    ('Familia Ejemplo',  '2026-07-15', 'Boda',     'Hacienda de Prueba',   180, 'confirmado'),
    ('Empresa Ejemplo',  '2026-07-22', 'Corporativo', 'Salón Centro',      80,  'pendiente'),
    ('Cliente Ejemplo',  '2026-08-10', 'XV años',  'Jardín de Prueba',     150, 'cotizacion');

-- Detalle del primer evento (asignación de artículos)
INSERT INTO DetalleEvento (id_evento, id_articulo, cantidad_asignada, cantidad_devuelta) VALUES
    (1, 1, 180, 0),  -- 180 sillas Tiffany
    (1, 2,  20, 0),  -- 20 mesas redondas
    (1, 3, 180, 0),  -- 180 copas champagne
    (1, 5, 180, 0);  -- 180 platos base