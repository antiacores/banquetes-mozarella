-- Tabla de artículos de cajón por evento
-- Estos son artículos extra (vajilla básica, bebidas, etc.)
-- que no están en el inventario principal pero van en cada evento
CREATE TABLE IF NOT EXISTS ListaCajon (
    id_cajon    SERIAL PRIMARY KEY,
    id_evento   INTEGER REFERENCES Evento(id_evento) ON DELETE CASCADE,
    nombre      VARCHAR(150) NOT NULL,
    cantidad    INTEGER,
    modelo_color VARCHAR(100),
    orden       INTEGER DEFAULT 0  -- para mantener el orden de la lista
);

-- Artículos base de cajón (plantilla por defecto)
-- Estos se insertan automáticamente al crear un evento
-- El sistema copia esta plantilla y la asigna al evento
CREATE TABLE IF NOT EXISTS PlantillaCajon (
    id_plantilla  SERIAL PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    orden         INTEGER DEFAULT 0
);

-- Insertar artículos de la plantilla (los de las imágenes)
INSERT INTO PlantillaCajon (nombre, orden) VALUES
  ('Descansos',               1),
  ('Hojitas p/picante',       2),
  ('Porta Sobres',            3),
  ('Vaso High ball',          4),
  ('Copa para Gin',           5),
  ('Caballito tequila C/plato', 6),
  ('Tablones',                7),
  ('Terno de café con plato', 8),
  ('Cubierto 4 pzs',          9),
  ('Jarra café',              10),
  ('Jarra cristal',           11),
  ('Cafetera',                12),
  ('Panera',                  13),
  ('Plato pan',               14),
  ('Jarra crema',             15),
  ('Hielera cónica',          16),
  ('Pinzas',                  17),
  ('Saleros',                 18),
  ('Ceniceros',               19),
  ('Charola ovalada',         20),
  ('Charola bar',             21),
  ('Percheros',               22),
  ('Hielera Grande',          23),
  ('Garrafones',              24),
  ('Horno',                   25),
  ('Parrillas',               26),
  ('Tanque de gas',           27),
  ('Barra de servicio',       28),
  ('Herramientas',            29),
  ('Squirt',                  30),
  ('Cocacola',                31),
  ('Mineral',                 32),
  ('Lámparas de mesa',        33),
  ('Cojín marfil',            34),
  ('Mandiles',                35),
  ('Limpiones',               36),
  ('Cajón Tablón',            37),
  ('Fundas de descanso-charola', 38),
  ('Filipina',                39),
  ('Uvas y ciruelas',         40)
ON CONFLICT DO NOTHING;

-- Verificar
SELECT COUNT(*) as total_plantilla FROM PlantillaCajon;