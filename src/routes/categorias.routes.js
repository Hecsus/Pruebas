const express = require('express');
const router = express.Router();
const controller = require('../controllers/categorias.controller');
// Validaciones de filtros opcionales
const { listFilters } = require('../validators/categorias.validators');
const requireAuth = require('../middlewares/requireAuth'); // Exige usuario en sesión

// Listado con filtros combinables
router.get('/', requireAuth, listFilters, controller.list);
// Formulario para crear
router.get('/nuevo', requireAuth, controller.form);
// Guardar categoría nueva
router.post('/nuevo', requireAuth, controller.validator, controller.create);
// Formulario de edición
router.get('/:id/editar', requireAuth, controller.form);
// Actualizar categoría
router.post('/:id/editar', requireAuth, controller.validator, controller.update);
// Eliminar categoría
router.get('/:id/eliminar', requireAuth, controller.remove);

module.exports = router;
// [checklist] permiso correcto, validaciones y SQL seguro
