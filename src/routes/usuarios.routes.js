const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuarios.controller');
// Reglas de validación
const { userRules, newUserPasswordRules, changePasswordRules, listFilters } = require('../validators/usuarios.validators');
const requireAuth = require('../middlewares/requireAuth'); // Debe estar autenticado
const requireRole = require('../middlewares/requireRole'); // Solo admin accede

// GET /usuarios - listado de usuarios
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  listFilters,             // Valida filtros (role ∈ {admin, operador}, etc.) y mantiene feedback consistente
  controller.list
);

// GET /usuarios/nuevo - formulario de creación
router.get('/nuevo', requireAuth, requireRole('admin'), controller.form);

// POST /usuarios/nuevo - guardar usuario nuevo
router.post('/nuevo', requireAuth, requireRole('admin'), [...userRules, ...newUserPasswordRules], controller.create);

// GET /usuarios/:id/editar - formulario de edición
router.get('/:id/editar', requireAuth, requireRole('admin'), controller.form);

// POST /usuarios/:id/editar - actualizar datos (sin contraseña)
router.post('/:id/editar', requireAuth, requireRole('admin'), userRules, controller.update);

// GET /usuarios/:id/eliminar - borrar usuario
router.get('/:id/eliminar', requireAuth, requireRole('admin'), controller.remove);

// GET /usuarios/:id/cambiar-password - formulario cambio contraseña
router.get('/:id/cambiar-password', requireAuth, requireRole('admin'), controller.showChangePassword);

// POST /usuarios/:id/cambiar-password - actualizar contraseña
router.post('/:id/cambiar-password', requireAuth, requireRole('admin'), changePasswordRules, controller.changePassword);

module.exports = router;
// [checklist] Requisito implementado | Validación aplicada | SQL parametrizado (si aplica) | Comentarios modo curso | Sin código muerto
