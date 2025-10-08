const pool = require('../config/db');
const { validationResult, matchedData, body, param, query } = require('express-validator');
const { enrichProductsWithRelations } = require('../utils/product-relations');
const validateReturnTo = require('../utils/returnTo');

// Determina una ruta de retorno segura priorizando returnTo y referer internos
function resolveReturnTo(req, fallbackPath) {
  const requested = req.query.returnTo;
  if (requested) {
    const safe = validateReturnTo(requested);
    if (safe === requested) return safe;
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.host === req.get('host')) {
        const candidate = url.pathname + (url.search || '');
        const safe = validateReturnTo(candidate);
        if (safe === candidate) return safe;
      }
    } catch (err) {
      console.error('[localizaciones] Referer inválido ignorado:', err.message);
    }
  }

  return fallbackPath;
}

// Listado de localizaciones con filtros opcionales
exports.list = async (req, res) => {
  const errors = validationResult(req);
  const data = matchedData(req, { locations: ['query'] });

  if (!errors.isEmpty()) {
    const [rows] = await pool.query(
      `SELECT l.*, COUNT(p.id) AS productos_count
       FROM localizaciones l
       LEFT JOIN productos p ON p.localizacion_id = l.id
       GROUP BY l.id
       ORDER BY l.id ASC`
    );
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

  const SORTABLE = { id: 'l.id', nombre: 'l.nombre' };
  const sortCol = SORTABLE[data.sortBy] || 'l.id';
  const sortDir = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const clauses = [];
  const params = [];
  if (data.id) { clauses.push('l.id = ?'); params.push(data.id); }
  if (data.nombre) { clauses.push('l.nombre LIKE ?'); params.push(`%${data.nombre}%`); }
  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT l.*, COUNT(p.id) AS productos_count
     FROM localizaciones l
     LEFT JOIN productos p ON p.localizacion_id = l.id
     ${whereSql}
     GROUP BY l.id
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM localizaciones l ${whereSql}`, params);
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

// Validaciones para /localizaciones/:id/productos
exports.productsByLocationValidators = [
  param('id').isInt({ min: 1 }).toInt(),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }).toInt()
];

// Listado de productos asociados a una localización (FK directa en productos)
exports.productsByLocation = async (req, res) => {
  const errors = validationResult(req);
  const data = matchedData(req, { locations: ['params', 'query'] });

  if (!errors.isEmpty()) {
    return res.status(400).render('pages/productos/by-relation', {
      title: 'Localización no válida',
      relation: null,
      items: [],
      page: 1,
      totalPages: 1,
      pageSize: data.pageSize || 10,
      basePath: '/localizaciones',
      query: req.query,
      errors: errors.array(),
      returnTo: '/localizaciones',
      viewClass: 'view-productos'
    });
  }

  const page = data.page || 1;
  const pageSize = data.pageSize || 10;
  const offset = (page - 1) * pageSize;

  try {
    const [locationRows] = await pool.query('SELECT id, nombre FROM localizaciones WHERE id = ?', [data.id]);
    if (!locationRows.length) {
      return res.status(404).render('pages/productos/by-relation', {
        title: 'Localización no encontrada',
        relation: null,
        items: [],
        page: 1,
        totalPages: 1,
        pageSize,
        basePath: '/localizaciones',
        query: req.query,
        errors: [{ msg: 'La localización solicitada no existe.' }],
        returnTo: '/localizaciones',
        viewClass: 'view-productos'
      });
    }

    const localizacion = locationRows[0];
    const [products] = await pool.query(
      `SELECT p.id, p.nombre, p.precio, p.stock, p.stock_minimo, l.id AS localizacion_id, l.nombre AS localizacion
       FROM productos p
       LEFT JOIN localizaciones l ON l.id = p.localizacion_id
       WHERE p.localizacion_id = ?
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [data.id, pageSize, offset]
    );

    await enrichProductsWithRelations(products);

    const [countRows] = await pool.query(
      `SELECT COUNT(p.id) AS total
       FROM productos p
       WHERE p.localizacion_id = ?`,
      [data.id]
    );
    const totalItems = countRows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    res.render('pages/productos/by-relation', {
      title: `Productos de la localización: ${localizacion.nombre}`,
      relation: { tipo: 'localización', nombre: localizacion.nombre, id: localizacion.id, total: totalItems },
      items: products,
      page,
      totalPages,
      pageSize,
      basePath: `/localizaciones/${localizacion.id}/productos`,
      query: req.query,
      errors: [],
      returnTo: resolveReturnTo(req, '/localizaciones'),
      viewClass: 'view-productos'
    });
  } catch (err) {
    console.error('[localizaciones] Error listando productos por localización:', err);
    res.status(500).render('pages/productos/by-relation', {
      title: 'Error al listar productos',
      relation: null,
      items: [],
      page: 1,
      totalPages: 1,
      pageSize,
      basePath: '/localizaciones',
      query: req.query,
      errors: [{ msg: 'Ocurrió un problema al consultar la base de datos.' }],
      returnTo: resolveReturnTo(req, '/localizaciones'),
      viewClass: 'view-productos'
    });
  }
};
