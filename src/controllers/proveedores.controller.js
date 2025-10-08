const pool = require('../config/db');
const { validationResult, matchedData, body, param, query } = require('express-validator');
const { enrichProductsWithRelations } = require('../utils/product-relations');
const validateReturnTo = require('../utils/returnTo');

// Calcula ruta de retorno segura reutilizando la utilidad de returnTo
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
      console.error('[proveedores] Referer inválido ignorado:', err.message);
    }
  }

  return fallbackPath;
}

// Listado de proveedores con filtros opcionales
exports.list = async (req, res) => {
  const errors = validationResult(req);
  const data = matchedData(req, { locations: ['query'] });

  if (!errors.isEmpty()) {
    const [rows] = await pool.query(
      `SELECT pr.*, COUNT(pp.producto_id) AS productos_count
       FROM proveedores pr
       LEFT JOIN producto_proveedor pp ON pp.proveedor_id = pr.id
       GROUP BY pr.id
       ORDER BY pr.id ASC`
    );
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

  const SORTABLE = { id: 'pr.id', nombre: 'pr.nombre' };
  const sortCol = SORTABLE[data.sortBy] || 'pr.id';
  const sortDir = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const clauses = [];
  const params = [];
  if (data.id) { clauses.push('pr.id = ?'); params.push(data.id); }
  if (data.nombre) { clauses.push('pr.nombre LIKE ?'); params.push(`%${data.nombre}%`); }
  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT pr.*, COUNT(pp.producto_id) AS productos_count
     FROM proveedores pr
     LEFT JOIN producto_proveedor pp ON pp.proveedor_id = pr.id
     ${whereSql}
     GROUP BY pr.id
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM proveedores pr ${whereSql}`, params);
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

// Validaciones para /proveedores/:id/productos
exports.productsByProviderValidators = [
  param('id').isInt({ min: 1 }).toInt(),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }).toInt()
];

// Listado de productos asociados a un proveedor (tabla puente producto_proveedor)
exports.productsByProvider = async (req, res) => {
  const errors = validationResult(req);
  const data = matchedData(req, { locations: ['params', 'query'] });

  if (!errors.isEmpty()) {
    return res.status(400).render('pages/productos/by-relation', {
      title: 'Proveedor no válido',
      relation: null,
      items: [],
      page: 1,
      totalPages: 1,
      pageSize: data.pageSize || 10,
      basePath: '/proveedores',
      query: req.query,
      errors: errors.array(),
      returnTo: '/proveedores',
      viewClass: 'view-productos'
    });
  }

  const page = data.page || 1;
  const pageSize = data.pageSize || 10;
  const offset = (page - 1) * pageSize;

  try {
    const [providerRows] = await pool.query('SELECT id, nombre FROM proveedores WHERE id = ?', [data.id]);
    if (!providerRows.length) {
      return res.status(404).render('pages/productos/by-relation', {
        title: 'Proveedor no encontrado',
        relation: null,
        items: [],
        page: 1,
        totalPages: 1,
        pageSize,
        basePath: '/proveedores',
        query: req.query,
        errors: [{ msg: 'El proveedor solicitado no existe.' }],
        returnTo: '/proveedores',
        viewClass: 'view-productos'
      });
    }

    const proveedor = providerRows[0];
    const [products] = await pool.query(
      `SELECT DISTINCT p.id, p.nombre, p.precio, p.stock, p.stock_minimo, l.id AS localizacion_id, l.nombre AS localizacion
       FROM productos p
       JOIN producto_proveedor pp ON pp.producto_id = p.id
       LEFT JOIN localizaciones l ON l.id = p.localizacion_id
       WHERE pp.proveedor_id = ?
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [data.id, pageSize, offset]
    );

    await enrichProductsWithRelations(products);

    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM productos p
       JOIN producto_proveedor pp ON pp.producto_id = p.id
       WHERE pp.proveedor_id = ?`,
      [data.id]
    );
    const totalItems = countRows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    res.render('pages/productos/by-relation', {
      title: `Productos del proveedor: ${proveedor.nombre}`,
      relation: { tipo: 'proveedor', nombre: proveedor.nombre, id: proveedor.id, total: totalItems },
      items: products,
      page,
      totalPages,
      pageSize,
      basePath: `/proveedores/${proveedor.id}/productos`,
      query: req.query,
      errors: [],
      returnTo: resolveReturnTo(req, '/proveedores'),
      viewClass: 'view-productos'
    });
  } catch (err) {
    console.error('[proveedores] Error listando productos por proveedor:', err);
    res.status(500).render('pages/productos/by-relation', {
      title: 'Error al listar productos',
      relation: null,
      items: [],
      page: 1,
      totalPages: 1,
      pageSize,
      basePath: '/proveedores',
      query: req.query,
      errors: [{ msg: 'Ocurrió un problema al consultar la base de datos.' }],
      returnTo: resolveReturnTo(req, '/proveedores'),
      viewClass: 'view-productos'
    });
  }
};
