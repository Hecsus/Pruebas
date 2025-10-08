// Middleware de rate limiting para login
// Propósito: limitar intentos fallidos y bloquear temporalmente tras 5 errores.
// Entradas: req.ip y (opcional) req.body.email.
// Salidas: continúa al siguiente middleware o redirige a /auth/locked.
// Limitaciones: almacenamiento en memoria; se reinicia al reiniciar servidor.
// Recomendación: en producción usar almacén persistente (Redis/DB).

const attempts = new Map(); // clave -> { count, blockedUntil }
const LIMIT = 5;
const BLOCK_MS = 10 * 60 * 1000; // 10 minutos

module.exports = function rateLimitLogin(req, res, next) {
  const ip = req.ip;
  const email = req.body?.email || '';
  const now = Date.now();
  const keys = [ip, email && `email:${email}`, email && `${ip}|${email}`].filter(Boolean);

  const isBlocked = key => {
    const info = attempts.get(key);
    if (!info) return false;
    if (info.blockedUntil && info.blockedUntil > now) return true;
    if (info.blockedUntil && info.blockedUntil <= now) attempts.delete(key);
    return false;
  };

  if (keys.some(isBlocked)) return res.redirect('/auth/locked');

  res.on('finish', () => {
    const success = res.statusCode === 302; // redirección implica login correcto
    keys.forEach(key => {
      if (success) {
        attempts.delete(key);
      } else {
        const info = attempts.get(key) || { count: 0, blockedUntil: 0 };
        info.count += 1;
        if (info.count >= LIMIT) {
          info.blockedUntil = now + BLOCK_MS;
        }
        attempts.set(key, info);
      }
    });
  });

  next();
};
