-- Script alternativo sin TRUNCATE para recargar datos realistas.
-- Úsalo en phpMyAdmin si 20250901_semillas_realistas.sql falla con error #1701.
USE inventario;
SET FOREIGN_KEY_CHECKS=0;
DELETE FROM producto_proveedor;
DELETE FROM producto_categoria;
DELETE FROM productos;
DELETE FROM proveedores;
DELETE FROM categorias;
DELETE FROM localizaciones;
DELETE FROM usuarios;
DELETE FROM roles;
ALTER TABLE roles AUTO_INCREMENT=1;
ALTER TABLE usuarios AUTO_INCREMENT=1;
ALTER TABLE localizaciones AUTO_INCREMENT=1;
ALTER TABLE categorias AUTO_INCREMENT=1;
ALTER TABLE proveedores AUTO_INCREMENT=1;
ALTER TABLE productos AUTO_INCREMENT=1;
ALTER TABLE producto_categoria AUTO_INCREMENT=1;
ALTER TABLE producto_proveedor AUTO_INCREMENT=1;
SET FOREIGN_KEY_CHECKS=1;

INSERT INTO roles (id, nombre) VALUES
(1,'admin'),(2,'operador');

INSERT INTO usuarios (nombre, apellidos, email, telefono, password, rol_id) VALUES
('Laura','González','laura.gonzalez@tienda.local','600111222','$2a$10$L1YolqS1AzMFNJfNpQYWeeKP1dG/xL3I0znXTWI3M4cOBrYPngtp2',1),
('Carlos','Pérez','carlos.perez@tienda.local','600333444','$2a$10$L1YolqS1AzMFNJfNpQYWeeKP1dG/xL3I0znXTWI3M4cOBrYPngtp2',1),
('Marta','Jiménez','marta.jimenez@tienda.local','600555666','$2a$10$XAJcRoEKxKZDuifmXYYtd.KkCqc4HS3zIbGVx1/ATrTUnCeKV4IUi',2),
('Javier','Ruiz','javier.ruiz@tienda.local','600777888','$2a$10$XAJcRoEKxKZDuifmXYYtd.KkCqc4HS3zIbGVx1/ATrTUnCeKV4IUi',2),
('Lucía','López','lucia.lopez@tienda.local','600111333','$2a$10$XAJcRoEKxKZDuifmXYYtd.KkCqc4HS3zIbGVx1/ATrTUnCeKV4IUi',2),
('Sergio','Martín','sergio.martin@tienda.local','600222444','$2a$10$XAJcRoEKxKZDuifmXYYtd.KkCqc4HS3zIbGVx1/ATrTUnCeKV4IUi',2),
('Ana','Navarro','ana.navarro@tienda.local','600333555','$2a$10$XAJcRoEKxKZDuifmXYYtd.KkCqc4HS3zIbGVx1/ATrTUnCeKV4IUi',2),
('Diego','Romero','diego.romero@tienda.local','600444666','$2a$10$XAJcRoEKxKZDuifmXYYtd.KkCqc4HS3zIbGVx1/ATrTUnCeKV4IUi',2);

INSERT INTO categorias (nombre) VALUES
('Herramientas'),('Pintura'),('Fontanería'),('Electricidad'),('Informática'),('Limpieza'),('Ferretería'),('Jardinería'),('Papelería'),('Pequeño electrodoméstico');

INSERT INTO proveedores (nombre) VALUES
('Suministros López'),('Ferretería El Tornillo'),('Electro Reus'),('Papeles Martínez'),('Distribuciones Romero'),('TecnoPiso'),('BricoTarraco'),('Almacenes García');

INSERT INTO localizaciones (nombre) VALUES
('Almacén Central'),('Pasillo A'),('Pasillo B'),('Estantería 1'),('Estantería 2'),('Mostrador'),('Sótano'),('Almacén Secundario');

INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, localizacion_id) VALUES
('Martillo de uña','',12.50,5,10,2),
('Destornillador plano','',3.20,20,15,2),
('Taladro percutor 800W','',85.00,2,5,1),
('Pintura blanca 15L','',25.00,8,10,3),
('Cable eléctrico 1.5mm 100m','',40.00,30,20,3),
('Tornillos 4x40 caja 100u','',5.00,50,40,2),
('Fregona microfibra','',6.00,3,5,6),
('Papel A4 500 hojas','',4.50,100,50,4),
('Ratón óptico USB','',9.99,4,10,6),
('Regleta 6 tomas con interruptor','',12.00,6,8,6),
('Bombilla LED E27 9W','',2.50,25,20,3),
('Llave inglesa ajustable','',14.00,7,10,2),
('Tubo PVC 20mm 2m','',3.80,12,15,3),
('Guantes de látex caja 100u','',7.50,60,30,5),
('Manguera de jardín 15m','',18.00,4,5,8),
('Cinta aislante negra','',1.20,15,10,3),
('Cepillo de barrer','',3.00,2,5,6),
('Ordenador portátil 15"','',600.00,1,1,6),
('Aspiradora 1200W','',80.00,0,2,6),
('Grapadora de escritorio','',8.00,25,20,4),
('Lámpara de mesa LED','',20.00,3,5,6),
('Detergente multiusos 5L','',9.00,10,8,5),
('Alicates universales','',11.00,9,10,2),
('USB 32GB','',6.00,40,20,6);

INSERT INTO producto_categoria (producto_id, categoria_id) VALUES
(1,1),(1,7),
(2,1),(2,7),
(3,1),(3,10),
(4,2),
(5,4),
(6,7),
(7,6),
(8,9),
(9,5),
(10,4),(10,10),
(11,4),
(12,1),(12,7),
(13,3),
(14,6),
(15,8),
(16,4),(16,7),
(17,6),
(18,5),
(19,10),
(20,9),
(21,4),(21,5),
(22,6),
(23,1),(23,7),
(24,5),(24,9);

INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES
(1,1),(1,2),
(2,2),
(3,2),(3,3),
(4,5),(4,6),
(5,3),
(6,2),
(7,8),
(8,4),
(9,3),
(10,3),
(11,3),
(12,1),
(13,5),
(14,8),
(15,8),
(16,3),(16,2),
(17,8),
(18,3),
(19,3),
(20,4),
(21,3),
(22,8),
(23,1),(23,2),
(24,3),(24,4);
