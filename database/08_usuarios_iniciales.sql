DELETE FROM Usuario;

-- Administrador — contraseña: admin1234
INSERT INTO Usuario (nombre, correo, contrasena, perfil, activo) VALUES (
  'Administrador',
  'admin@mozzarella.com',
  '$2b$12$yKmFn3wfO2ZUpNMI86obuO/e4WzAnR1BHZ2BXp2LsAc6jFvsIpkC.',
  'jefe',
  TRUE
);

-- Trabajador — contraseña: almacen1234
INSERT INTO Usuario (nombre, correo, contrasena, perfil, activo) VALUES (
  'Almacén',
  'almacen@mozzarella.com',
  '$2b$12$kzPVPLRUOJBNPU8ZinUEluDpL7XYUddOVzRtjTvmNrgArGPO1ytzy',
  'almacen',
  TRUE
);

SELECT id_usuario, nombre, correo, perfil, activo FROM Usuario;