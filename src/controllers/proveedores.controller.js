const pool = require('../config/db');
const { validationResult, matchedData, body } = require('express-validator');

// Listado de proveedores con filtros opcionales
exports.list = async (req, res) => {
  const errors = validationResult(req);
  const data = matchedData(req, { locations: ['query'] });

  if (!errors.isEmpty()) {
    const [rows] = await pool.query('SELECT * FROM proveedores ORDER BY id ASC');
    return res.render('pages/proveedores/list', {
      title: 'Proveedores',
      proveedores: rows,
      errors: errors.array(),
      query: req.query,
      page: 1,
      totalPages: 1,
      viewClass: 'view-proveedores'
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
    `SELECT * FROM proveedores ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM proveedores ${whereSql}`, params);
  const totalPages = Math.ceil(countRows[0].total / pageSize);

  res.render('pages/proveedores/list', {
    title: 'Proveedores',
    proveedores: rows,
    errors: [],
    query: req.query,
    page,
    totalPages,
    viewClass: 'view-proveedores'
  });
};

// Formulario de creación/edición
exports.form = async (req, res) => {
  let proveedor = null;
  if (req.params.id) {
    const [rows] = await pool.query('SELECT * FROM proveedores WHERE id=?', [req.params.id]);
    proveedor = rows[0];
  }
  const title = req.params.id ? 'Editar proveedor' : 'Nuevo proveedor';
  res.render('pages/proveedores/form', { title, proveedor, errors: [], viewClass: 'view-proveedores' });
};

// Crear
exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('pages/proveedores/form', { title: 'Nuevo proveedor', proveedor: null, errors: errors.array(), viewClass: 'view-proveedores' });
  }
  await pool.query('INSERT INTO proveedores (nombre) VALUES (?)', [req.body.nombre]);
  res.redirect('/proveedores');
};

// Actualizar
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('pages/proveedores/form', {
      title: 'Editar proveedor',
      proveedor: { id: req.params.id, nombre: req.body.nombre },
      errors: errors.array(),
      viewClass: 'view-proveedores'
    });
  }
  await pool.query('UPDATE proveedores SET nombre=? WHERE id=?', [req.body.nombre, req.params.id]);
  res.redirect('/proveedores');
};

// Eliminar
exports.remove = async (req, res) => {
  await pool.query('DELETE FROM proveedores WHERE id=?', [req.params.id]);
  res.redirect('/proveedores');
};

// Validator para formulario
exports.validator = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio')
];
