const pool = require('../config/db');
const { validationResult, matchedData, body } = require('express-validator');

// Listado de localizaciones con filtros opcionales
exports.list = async (req, res) => {
  const errors = validationResult(req);
  const data = matchedData(req, { locations: ['query'] });

  if (!errors.isEmpty()) {
    const [rows] = await pool.query('SELECT * FROM localizaciones ORDER BY id ASC');
    return res.render('pages/localizaciones/list', {
      title: 'Localizaciones',
      localizaciones: rows,
      errors: errors.array(),
      query: req.query,
      page: 1,
      totalPages: 1,
      viewClass: 'view-localizaciones'
    });
  }

  const page = data.page || 1;
  const pageSize = data.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const SORTABLE = ['id', 'nombre'];
  const sortCol = SORTABLE.includes(data.sortBy) ? data.sortBy : 'id';
  const sortDir = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const clauses = [];
  const params = [];
  if (data.id) { clauses.push('id = ?'); params.push(data.id); }
  if (data.nombre) { clauses.push('nombre LIKE ?'); params.push(`%${data.nombre}%`); }
  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT * FROM localizaciones ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM localizaciones ${whereSql}`, params);
  const totalPages = Math.ceil(countRows[0].total / pageSize);

  res.render('pages/localizaciones/list', {
    title: 'Localizaciones',
    localizaciones: rows,
    errors: [],
    query: req.query,
    page,
    totalPages,
    viewClass: 'view-localizaciones'
  });
};

// Formulario de creación/edición
exports.form = async (req, res) => {
  let localizacion = null;
  if (req.params.id) {
    const [rows] = await pool.query('SELECT * FROM localizaciones WHERE id=?', [req.params.id]);
    localizacion = rows[0];
  }
  const title = req.params.id ? 'Editar localización' : 'Nueva localización';
  res.render('pages/localizaciones/form', { title, localizacion, errors: [], viewClass: 'view-localizaciones' });
};

// Crear
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('pages/localizaciones/form', { title: 'Nueva localización', localizacion: null, errors: errors.array(), viewClass: 'view-localizaciones' });
  }
  await pool.query('INSERT INTO localizaciones (nombre) VALUES (?)', [req.body.nombre]);
  res.redirect('/localizaciones');
};

// Actualizar
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('pages/localizaciones/form', {
      title: 'Editar localización',
      localizacion: { id: req.params.id, nombre: req.body.nombre },
      errors: errors.array(),
      viewClass: 'view-localizaciones'
    });
  }
  await pool.query('UPDATE localizaciones SET nombre=? WHERE id=?', [req.body.nombre, req.params.id]);
  res.redirect('/localizaciones');
};

// Eliminar
exports.remove = async (req, res) => {
  await pool.query('DELETE FROM localizaciones WHERE id=?', [req.params.id]);
  res.redirect('/localizaciones');
};

// Validator para formulario
exports.validator = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio')
];
