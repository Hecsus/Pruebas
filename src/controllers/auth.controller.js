const pool = require('../config/db'); // Conexión a la BD
const bcrypt = require('bcryptjs');   // Para comparar hashes
const { validationResult } = require('express-validator'); // Manejo de validaciones
const validateReturnTo = require('../utils/returnTo');      // Evita redirecciones externas

/**
 * Muestra el formulario de login.
 * Propósito: enviar la vista limpia sin datos previos.
 * Entradas: req/res de Express.
 * Salidas: render de `pages/auth/login` con `errors:null` y `oldInput:{}`.
 * Validaciones: ninguna.
 * Manejo de errores: si la vista no existe, Express responderá 500.
 */
exports.showLogin = (req, res) => {
  // Sanitizamos returnTo sólo si viene definido en la query
  const returnTo = req.query.returnTo ? validateReturnTo(req.query.returnTo) : '';
  res.render('pages/auth/login', { title: 'Login', errors: null, oldInput: {}, returnTo, viewClass: '', hideChrome: true });
};

/**
 * Procesa las credenciales de login y crea la sesión.
 * Entradas: `email` y `password` en `req.body`.
 * Salidas: redirección a `/panel` o render de `login` con errores y datos previos.
 * Validaciones: `validationResult` recoge errores de `loginValidator`.
 * Manejo de errores: credenciales inválidas se informan sin exponer la contraseña; errores de DB muestran mensaje genérico.
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);            // Captura errores de validación
  const { email, password, returnTo } = req.body;  // Extrae datos del formulario
  const safeReturn = returnTo ? validateReturnTo(returnTo) : '';   // Valida ruta de retorno
  if (!errors.isEmpty()) {                         // Si hay fallos de validación
    return res.status(400).render('pages/auth/login', {
      title: 'Login',
      errors: errors.mapped?.() || null,
      oldInput: { email },                        // No reenviamos la contraseña
      returnTo: safeReturn,
      viewClass: '',
      hideChrome: true
    });
  }
  try {
    const [rows] = await pool.query(              // Busca usuario por email
      'SELECT u.*, r.nombre AS rol_nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE email = ?',
      [email]
    );
    if (!rows.length) {                           // Email no encontrado
      return res.status(400).render('pages/auth/login', {
        title: 'Login',
        errors: { auth: { msg: 'Credenciales inválidas' } },
        oldInput: { email },
        returnTo: safeReturn,
        viewClass: '',
        hideChrome: true
      });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password); // Compara hash
    if (!match) {                               // Contraseña incorrecta
      return res.status(400).render('pages/auth/login', {
        title: 'Login',
        errors: { auth: { msg: 'Credenciales inválidas' } },
        oldInput: { email },
        returnTo: safeReturn,
        viewClass: '',
        hideChrome: true
      });
    }
    req.session.user = { id: user.id, nombre: user.nombre, rol: user.rol_nombre }; // Guarda datos mínimos en sesión
    req.session.flash = { type: 'success', message: 'Bienvenido' };                 // Mensaje de bienvenida
    res.redirect(safeReturn || '/panel');                                           // Redirección validada
  } catch (err) {
    return res.status(500).render('pages/auth/login', {
      title: 'Login',
      errors: { server: { msg: 'Error inesperado' } },
      oldInput: { email },
      returnTo: safeReturn,
      viewClass: '',
      hideChrome: true
    });
  }
};

/**
 * Cierra la sesión del usuario.
 * Entradas: req/res con sesión activa.
 * Salidas: redirección a `/login`.
 * Validaciones: ninguna.
 * Manejo de errores: ignora errores al destruir la sesión.
 */
exports.logout = (req, res) => {
  req.session.destroy(() => {          // Al destruir la sesión
    res.redirect('/login');            // Redirige al formulario de login
  });
};
// [checklist] Requisito implementado | Validación aplicada | SQL parametrizado (si aplica) | Comentarios modo curso | Sin código muerto
