// Middleware para verificar si el usuario está autenticado
module.exports = (req, res, next) => {
  if (req.session.user) { // ¿Existe usuario en sesión?
    return next();        // Sí: continúa
  }
  // Almacena la ruta solicitada para volver tras login (returnTo)
  const returnTo = encodeURIComponent(req.originalUrl);
  return res.redirect(`/login?returnTo=${returnTo}`); // No autenticado → login con returnTo
};
// [checklist] permiso correcto y sin código muerto
