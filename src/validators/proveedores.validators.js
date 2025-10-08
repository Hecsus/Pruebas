const { query } = require('express-validator');

// Filtros opcionales para proveedores
const SORT_BY = ['id', 'nombre'];
const SORT_DIR = ['asc', 'desc'];

exports.listFilters = [
  query('id').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  query('nombre').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 100 }),
  query('sortBy').optional({ checkFalsy: true }).isIn(SORT_BY),
  query('sortDir').optional({ checkFalsy: true }).isIn(SORT_DIR),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }).toInt()
];
