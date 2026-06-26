-- Descripción: Vistas para los KPIs del dashboard y reportes

-- KPI 1: Total de artículos en inventario
CREATE OR REPLACE VIEW vw_total_inventario AS
SELECT
    SUM(cantidad_total)      AS total_piezas,
    SUM(cantidad_disponible) AS total_disponibles,
    COUNT(*)                 AS total_articulos_distintos
FROM Articulo
WHERE estado = 'activo';

-- KPI 2: Eventos programados este mes
CREATE OR REPLACE VIEW vw_eventos_mes AS
SELECT
    COUNT(*)  AS total_eventos_mes,
    estado,
    fecha
FROM Evento
WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY estado, fecha
ORDER BY fecha;

-- KPI 3: Artículos que requieren reposición
-- (cantidad_disponible está por debajo del mínimo)
CREATE OR REPLACE VIEW vw_articulos_bajo_stock AS
SELECT
    a.id_articulo,
    a.nombre,
    c.nombre          AS categoria,
    a.cantidad_disponible,
    a.cantidad_minima,
    (a.cantidad_minima - a.cantidad_disponible) AS faltante
FROM Articulo a
JOIN Categoria c ON a.id_categoria = c.id_categoria
WHERE a.cantidad_disponible < a.cantidad_minima
  AND a.estado = 'activo'
ORDER BY faltante DESC;

-- KPI 4: Top 10 artículos con más movimiento
-- Basado en el historial de DetalleEvento
CREATE OR REPLACE VIEW vw_top10_articulos AS
SELECT
    a.id_articulo,
    a.nombre,
    c.nombre            AS categoria,
    SUM(de.cantidad_asignada) AS total_asignaciones,
    COUNT(DISTINCT de.id_evento) AS veces_en_eventos
FROM DetalleEvento de
JOIN Articulo  a ON de.id_articulo  = a.id_articulo
JOIN Categoria c ON a.id_categoria  = c.id_categoria
GROUP BY a.id_articulo, a.nombre, c.nombre
ORDER BY total_asignaciones DESC
LIMIT 10;

-- VISTA: Disponibilidad por categoría (para barras del dashboard)
CREATE OR REPLACE VIEW vw_disponibilidad_categoria AS
SELECT
    c.id_categoria,
    c.nombre                                    AS categoria,
    SUM(a.cantidad_total)                       AS total,
    SUM(a.cantidad_disponible)                  AS disponible,
    ROUND(
        SUM(a.cantidad_disponible)::NUMERIC /
        NULLIF(SUM(a.cantidad_total), 0) * 100, 1
    )                                           AS porcentaje_disponible
FROM Categoria c
LEFT JOIN Articulo a ON c.id_categoria = a.id_categoria AND a.estado = 'activo'
GROUP BY c.id_categoria, c.nombre
ORDER BY porcentaje_disponible ASC;

-- VISTA: Alerta de disponibilidad por evento próximo
-- Detecta artículos insuficientes para eventos futuros
CREATE OR REPLACE VIEW vw_alertas_disponibilidad AS
SELECT
    e.id_evento,
    e.nombre_cliente,
    e.fecha,
    e.tipo,
    a.nombre                        AS articulo,
    de.cantidad_asignada            AS solicitado,
    a.cantidad_disponible           AS disponible_actual,
    (de.cantidad_asignada - a.cantidad_disponible) AS faltante
FROM DetalleEvento de
JOIN Evento   e ON de.id_evento   = e.id_evento
JOIN Articulo a ON de.id_articulo = a.id_articulo
WHERE e.fecha >= CURRENT_DATE
  AND e.estado NOT IN ('cancelado', 'finalizado')
  AND de.cantidad_asignada > a.cantidad_disponible
ORDER BY e.fecha, faltante DESC;

-- VISTA: Lista completa para exportación PDF de un evento
-- Se filtra por id_evento en la app
CREATE OR REPLACE VIEW vw_lista_evento_pdf AS
SELECT
    e.id_evento,
    e.nombre_cliente,
    e.fecha,
    e.tipo,
    e.lugar,
    e.num_invitados,
    c.nombre          AS categoria,
    a.nombre          AS articulo,
    de.cantidad_asignada,
    de.cantidad_devuelta,
    de.observaciones
FROM DetalleEvento de
JOIN Evento    e ON de.id_evento   = e.id_evento
JOIN Articulo  a ON de.id_articulo = a.id_articulo
JOIN Categoria c ON a.id_categoria = c.id_categoria
ORDER BY c.nombre, a.nombre;