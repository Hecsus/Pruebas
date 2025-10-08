// Rutas relacionadas con productos y listados de bajo stock.
// Se exportan dos routers: uno para CRUD de productos y otro para la vista filtrada.
const express = require('express');
const productosRouter = express.Router();      // Router principal para /productos
const bajoStockRouter = express.Router();      // Router independiente para /bajo-stock
const controller = require('../controllers/productos.controller');
const { productValidator, listFilters } = require('../validators/productos.validators');
const requireAuth = require('../middlewares/requireAuth'); // Exige sesión iniciada
const { upload } = require('../utils/upload'); // Manejo de imágenes con Multer 2.x

// === CRUD de productos ===
// Listar productos con filtros, orden y paginación
productosRouter.get('/', requireAuth, listFilters, controller.list);
// Formulario de creación
productosRouter.get('/nuevo', requireAuth, controller.form);
// Crear nuevo producto (incluye subida opcional de imagen)
productosRouter.post('/nuevo', requireAuth, upload.single('imagen'), productValidator, controller.create);
// Formulario de edición
productosRouter.get('/:id/editar', requireAuth, controller.form);
// Actualizar producto existente (puede reemplazar imagen)
productosRouter.post('/:id/editar', requireAuth, upload.single('imagen'), productValidator, controller.update);
// Eliminar producto
productosRouter.post('/:id/eliminar', requireAuth, controller.remove);
// QR imprimible del producto
productosRouter.get('/:id/qr', requireAuth, controller.qr);
// Detalle de producto
productosRouter.get('/:id', requireAuth, controller.detail);

// === Bajo stock ===
// Listado de productos con stock <= stock mínimo
bajoStockRouter.get('/', requireAuth, listFilters, controller.bajoStock);

module.exports = { productosRouter, bajoStockRouter };
