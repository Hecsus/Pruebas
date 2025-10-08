// Utilidad para validar la ruta "returnTo" recibida por query o formulario.
// Objetivo: evitar redirecciones abiertas a sitios externos.
// Entradas: cualquier valor (esperamos string) enviado por el cliente.
// Salidas: ruta interna segura comenzando con '/'. Si no es válida, retorna '/productos'.
// Reglas de seguridad:
// - Debe ser cadena.
// - Debe iniciar con '/'.
// - No debe iniciar con '//', lo que indicaría un protocolo externo.
function validateReturnTo(returnTo) {
  // Verifica tipo y formato básico
  if (typeof returnTo !== 'string') return '/productos';
  if (!returnTo.startsWith('/')) return '/productos';
  if (returnTo.startsWith('//')) return '/productos';
  return returnTo; // Se considera seguro, permanece dentro del sitio
}

module.exports = validateReturnTo;
