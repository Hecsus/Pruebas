/**
 * Utilidades para construir cláusulas SQL de manera segura.
 * Centraliza el mapeo de operadores permitidos y funciones helper.
 */

// Mapa whitelist de operadores disponibles en los filtros
const OPERATOR_SQL = { eq: '=', lte: '<=', gte: '>=' };

// Lista de claves admitidas, útil para validación con express-validator
const OPERATOR_KEYS = Object.keys(OPERATOR_SQL);

/**
 * Añade a los acumuladores una condición numérica comparando un campo con un valor.
 * Si no se indica un operador válido, se usa '=' por defecto.
 * @param {string[]} clauses - Array que acumula las cláusulas WHERE.
 * @param {Array} params - Array que acumula los valores parametrizados.
 * @param {string} fieldSql - Nombre del campo SQL (ya validado en whitelist).
 * @param {number|string} value - Valor numérico enviado por el usuario.
 * @param {string} opKey - Clave del operador recibido ('eq', 'lte', 'gte').
 */
function addNumericFilter(clauses, params, fieldSql, value, opKey) {
  if (value == null || value === '') return; // No hay valor: no se agrega condición
  const op = OPERATOR_SQL[opKey] || '='; // Operador seguro con '=' por defecto
  clauses.push(`${fieldSql} ${op} ?`);
  params.push(Number(value)); // Conversión a número para evitar inyecciones
}

module.exports = { OPERATOR_SQL, OPERATOR_KEYS, addNumericFilter };
