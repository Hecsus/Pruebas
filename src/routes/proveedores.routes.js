const express = require('express');
const router = express.Router();
const controller = require('../controllers/proveedores.controller');
// Validaciones de filtros y listados por proveedor
const { listFilters, productsByProviderValidators } = require('../validators/proveedores.validators');
const requireAuth = require('../middlewares/requireAuth'); // Exige sesión para operar

// Listado con filtros
router.get('/', requireAuth, listFilters, controller.list);
// Productos relacionados con un proveedor concreto
router.get('/:id/productos', requireAuth, productsByProviderValidators, controller.productsByProvider);
// Formulario de creación
router.get('/nuevo', requireAuth, controller.form);
// Guardar proveedor nuevo
router.post('/nuevo', requireAuth, controller.validator, controller.create);
// Formulario de edición
router.get('/:id/editar', requireAuth, controller.form);
// Actualizar proveedor
router.post('/:id/editar', requireAuth, controller.validator, controller.update);
// Eliminar proveedor
router.get('/:id/eliminar', requireAuth, controller.remove);

module.exports = router;
// [checklist] permiso correcto, validaciones y SQL seguro
