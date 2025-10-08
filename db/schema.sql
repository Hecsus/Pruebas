-- ------------------------------------------------------------
-- Creación de base de datos y tablas para Inventario Módulo 2
-- ------------------------------------------------------------

DROP DATABASE IF EXISTS inventario;
CREATE DATABASE inventario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario;

-- Tabla de roles (admin, operador)
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

-- Tabla de usuarios; cada usuario pertenece a un rol (N:1)
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  password VARCHAR(100) NOT NULL,
  rol_id INT NOT NULL,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Tabla de categorías
CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

-- Tabla de proveedores
CREATE TABLE proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

-- Tabla de localizaciones (lugares físicos en el almacén)
CREATE TABLE localizaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

-- Tabla de productos; cada producto está en una única localización (1:1)
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  stock_minimo INT NOT NULL,
  localizacion_id INT,
  FOREIGN KEY (localizacion_id) REFERENCES localizaciones(id)
);

-- Tabla intermedia producto-categoría (relación N:M)
CREATE TABLE producto_categoria (
  producto_id INT NOT NULL,
  categoria_id INT NOT NULL,
  PRIMARY KEY (producto_id, categoria_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

-- Tabla intermedia producto-proveedor (relación N:M)
CREATE TABLE producto_proveedor (
  producto_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- SEEDS de datos iniciales
-- ------------------------------------------------------------

INSERT INTO roles (nombre) VALUES ('admin'), ('operador');

-- Hash creado con bcrypt para la contraseña 'admin123'
INSERT INTO usuarios (nombre, apellidos, email, telefono, password, rol_id) VALUES
('Admin', 'Principal', 'admin@demo.local', NULL, '$2a$12$pdEnaSyJUF53FPOfCwJ2S.8s9LT2Ozft9smeZlRJ1o0YmRvDbQ3Ju', 1);

INSERT INTO localizaciones (nombre) VALUES
('Almacén A'),
('Almacén B'),
('Almacén C');

INSERT INTO categorias (nombre) VALUES
('Electrónica'),
('Oficina');

INSERT INTO proveedores (nombre) VALUES
('Proveedor Uno'),
('Proveedor Dos');

INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, localizacion_id) VALUES
('Teclado', 'Teclado mecánico', 50.00, 5, 3, 1),
('Mouse', 'Mouse óptico', 20.00, 2, 5, 2);

INSERT INTO producto_categoria (producto_id, categoria_id) VALUES
(1,1),
(2,2);

INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES
(1,1),
(1,2),
(2,1);

-- Vista para productos con stock por debajo del mínimo
CREATE VIEW productos_bajo_stock AS
SELECT p.*
FROM productos p
WHERE p.stock < p.stock_minimo;

