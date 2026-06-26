-- Descripción: Triggers para mantener integridad del inventario

-- TRIGGER 1: Al insertar una BajaInventario
-- Descuenta cantidad_total y cantidad_disponible del artículo
CREATE OR REPLACE FUNCTION fn_actualizar_baja()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Articulo
    SET cantidad_total      = cantidad_total      - NEW.cantidad,
        cantidad_disponible = cantidad_disponible - NEW.cantidad
    WHERE id_articulo = NEW.id_articulo;

    -- Evitar cantidades negativas
    UPDATE Articulo
    SET cantidad_total      = GREATEST(cantidad_total, 0),
        cantidad_disponible = GREATEST(cantidad_disponible, 0)
    WHERE id_articulo = NEW.id_articulo;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_baja_inventario
AFTER INSERT ON BajaInventario
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_baja();

-- TRIGGER 2: Al insertar un DetalleEvento (asignación)
-- Descuenta cantidad_disponible (NO total: el artículo existe, solo está comprometido en un evento)
CREATE OR REPLACE FUNCTION fn_asignar_articulo()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Articulo
    SET cantidad_disponible = cantidad_disponible - NEW.cantidad_asignada
    WHERE id_articulo = NEW.id_articulo;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asignar_detalle
AFTER INSERT ON DetalleEvento
FOR EACH ROW EXECUTE FUNCTION fn_asignar_articulo();

-- TRIGGER 3: Al actualizar cantidad_devuelta en DetalleEvento
-- Devuelve la diferencia al disponible cuando regresa el material
CREATE OR REPLACE FUNCTION fn_devolver_articulo()
RETURNS TRIGGER AS $$
DECLARE
    diferencia INT;
BEGIN
    diferencia := NEW.cantidad_devuelta - COALESCE(OLD.cantidad_devuelta, 0);

    IF diferencia > 0 THEN
        UPDATE Articulo
        SET cantidad_disponible = cantidad_disponible + diferencia
        WHERE id_articulo = NEW.id_articulo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_devolucion_detalle
AFTER UPDATE OF cantidad_devuelta ON DetalleEvento
FOR EACH ROW EXECUTE FUNCTION fn_devolver_articulo();

-- TRIGGER 4: Al insertar una Reposicion
-- Suma cantidad a cantidad_total Y cantidad_disponible
CREATE OR REPLACE FUNCTION fn_reponer_articulo()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Articulo
    SET cantidad_total      = cantidad_total      + NEW.cantidad,
        cantidad_disponible = cantidad_disponible + NEW.cantidad
    WHERE id_articulo = NEW.id_articulo;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reposicion
AFTER INSERT ON Reposicion
FOR EACH ROW EXECUTE FUNCTION fn_reponer_articulo();