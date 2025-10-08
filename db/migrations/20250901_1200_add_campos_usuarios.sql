USE inventario;
ALTER TABLE usuarios
  ADD apellidos VARCHAR(100) NOT NULL AFTER nombre,
  ADD telefono VARCHAR(20) AFTER email;
