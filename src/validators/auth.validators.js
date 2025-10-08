const { body } = require('express-validator');

/**
 * Validaciones para el formulario de login.
 * Propósito: asegurar formato correcto de email y presencia de contraseña.
 * Entradas: campos `email` y `password` en `req.body`.
 * Salidas: errores accesibles mediante `validationResult`.
 * Manejo de errores: mensajes personalizados definidos en `withMessage`.
 */
exports.loginValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];
