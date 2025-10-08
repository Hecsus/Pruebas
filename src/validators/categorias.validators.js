const { query } = require('express-validator');

// Filtros opcionales para listado de categorías
const SORT_BY = ['id', 'nombre'];
const SORT_DIR = ['asc', 'desc'];

exports.listFilters = [
  // ID numérico positivo
  query('id').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  // Nombre parcial, máximo 100 caracteres
  query('nombre').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 100 }),
  // Orden y dirección
  query('sortBy').optional({ checkFalsy: true }).isIn(SORT_BY),
  query('sortDir').optional({ checkFalsy: true }).isIn(SORT_DIR),
  // Paginación
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }).toInt()
];
