const pool = require('../config/db');
const { validationResult, matchedData, body } = require('express-validator');

// Listado de categorías con filtros opcionales y paginación
exports.list = async (req, res) => {
  const errors = validationResult(req);                        // Resultado de validaciones
  const data = matchedData(req, { locations: ['query'] });      // Parámetros saneados

  if (!errors.isEmpty()) {                                     // Si hay errores en filtros
    const [rows] = await pool.query('SELECT * FROM categorias ORDER BY id ASC');
    return res.render('pages/categorias/list', {
      title: 'Categorías',
      categorias: rows,
      errors: errors.array(),
      query: req.query,
      page: 1,
      totalPages: 1,
      viewClass: 'view-categorias'
    });
  }

  const page = data.page || 1;                                 // Página actual
  const pageSize = data.pageSize || 20;                        // Registros por página
  const offset = (page - 1) * pageSize;                        // Cálculo de desplazamiento

  const SORTABLE = ['id', 'nombre'];
  const sortCol = SORTABLE.includes(data.sortBy) ? data.sortBy : 'id';
  const sortDir = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const clauses = [];
  const params = [];
  if (data.id) { clauses.push('id = ?'); params.push(data.id); }
  if (data.nombre) { clauses.push('nombre LIKE ?'); params.push(`%${data.nombre}%`); }
  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT * FROM categorias ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM categorias ${whereSql}`, params);
  const totalPages = Math.ceil(countRows[0].total / pageSize);

  res.render('pages/categorias/list', {
    title: 'Categorías',
    categorias: rows,
    errors: [],
    query: req.query,
    page,
    totalPages,
    viewClass: 'view-categorias'
  });
};

// Mostrar formulario de creación/edición
exports.form = async (req, res) => {
  let categoria = null;
  if (req.params.id) {
    const [rows] = await pool.query('SELECT * FROM categorias WHERE id=?', [req.params.id]);
    categoria = rows[0];
  }
  const title = req.params.id ? 'Editar categoría' : 'Nueva categoría';
  res.render('pages/categorias/form', { title, categoria, errors: [], viewClass: 'view-categorias' });
};

// Crear categoría
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('pages/categorias/form', { title: 'Nueva categoría', categoria: null, errors: errors.array(), viewClass: 'view-categorias' });
  }
  await pool.query('INSERT INTO categorias (nombre) VALUES (?)', [req.body.nombre]);
  res.redirect('/categorias');
};

// Actualizar categoría existente
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('pages/categorias/form', {
      title: 'Editar categoría',
      categoria: { id: req.params.id, nombre: req.body.nombre },
      errors: errors.array(),
      viewClass: 'view-categorias'
    });
  }
  await pool.query('UPDATE categorias SET nombre=? WHERE id=?', [req.body.nombre, req.params.id]);
  res.redirect('/categorias');
};

// Eliminar categoría
exports.remove = async (req, res) => {
  await pool.query('DELETE FROM categorias WHERE id=?', [req.params.id]);
  res.redirect('/categorias');
};

// Validator simple para nombre
exports.validator = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio')
];
