const express = require('express');
const router = express.Router();
const controller = require('../controllers/localizaciones.controller');
// Validaciones de filtros
const { listFilters } = require('../validators/localizaciones.validators');
const requireAuth = require('../middlewares/requireAuth'); // Exige login para operar

// Listado con filtros
router.get('/', requireAuth, listFilters, controller.list);
// Formulario de creación
router.get('/nuevo', requireAuth, controller.form);
// Guardar localización nueva
router.post('/nuevo', requireAuth, controller.validator, controller.create);
// Formulario de edición
router.get('/:id/editar', requireAuth, controller.form);
// Actualizar localización
router.post('/:id/editar', requireAuth, controller.validator, controller.update);
// Eliminar localización
router.get('/:id/eliminar', requireAuth, controller.remove);

module.exports = router;
// [checklist] permiso correcto, validaciones y SQL seguro
