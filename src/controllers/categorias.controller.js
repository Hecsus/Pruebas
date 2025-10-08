const pool = require('../config/db');
const { validationResult, matchedData, body, param, query } = require('express-validator');
const { enrichProductsWithRelations } = require('../utils/product-relations'); // Reutiliza consultas de relaciones
const validateReturnTo = require('../utils/returnTo'); // Evita redirecciones externas

// Helper interno: determina a dónde volver tras ver productos relacionados
function resolveReturnTo(req, fallbackPath) {
  const requested = req.query.returnTo;
  if (requested) {
    const safe = validateReturnTo(requested);
    if (safe === requested) return safe; // Solo aceptamos si pasa la validación sin cambios
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
      console.error('[categorias] Referer inválido ignorado:', err.message);
    }
  }

  return fallbackPath; // Último recurso: ruta base segura
}

// Listado de categorías con filtros opcionales y paginación
exports.list = async (req, res) => {
  const errors = validationResult(req);                        // Resultado de validaciones
  const data = matchedData(req, { locations: ['query'] });      // Parámetros saneados

  if (!errors.isEmpty()) {                                     // Si hay errores en filtros
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(pc.producto_id) AS productos_count
       FROM categorias c
       LEFT JOIN producto_categoria pc ON pc.categoria_id = c.id
       GROUP BY c.id
       ORDER BY c.id ASC`
    );
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

  const SORTABLE = { id: 'c.id', nombre: 'c.nombre' };
  const sortCol = SORTABLE[data.sortBy] || 'c.id';
  const sortDir = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const clauses = [];
  const params = [];
  if (data.id) { clauses.push('c.id = ?'); params.push(data.id); }
  if (data.nombre) { clauses.push('c.nombre LIKE ?'); params.push(`%${data.nombre}%`); }
  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT c.*, COUNT(pc.producto_id) AS productos_count
     FROM categorias c
     LEFT JOIN producto_categoria pc ON pc.categoria_id = c.id
     ${whereSql}
     GROUP BY c.id
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM categorias c ${whereSql}`, params);
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

// Validaciones para la ruta /categorias/:id/productos (param y paginación)
exports.productsByCategoryValidators = [
  param('id').isInt({ min: 1 }).toInt(),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }).toInt()
];

// Listado de productos asociados a una categoría concreta
exports.productsByCategory = async (req, res) => {
  const errors = validationResult(req); // Validaciones de param/query
  const data = matchedData(req, { locations: ['params', 'query'] });

  if (!errors.isEmpty()) {
    return res.status(400).render('pages/productos/by-relation', {
      title: 'Categoría no válida',
      relation: null,
      items: [],
      page: 1,
      totalPages: 1,
      pageSize: data.pageSize || 10,
      basePath: '/categorias',
      query: req.query,
      errors: errors.array(),
      returnTo: '/categorias',
      viewClass: 'view-productos'
    });
  }

  const page = data.page || 1;
  const pageSize = data.pageSize || 10;
  const offset = (page - 1) * pageSize;

  try {
    const [categoriaRows] = await pool.query('SELECT id, nombre FROM categorias WHERE id = ?', [data.id]);
    if (!categoriaRows.length) {
      return res.status(404).render('pages/productos/by-relation', {
        title: 'Categoría no encontrada',
        relation: null,
        items: [],
        page: 1,
        totalPages: 1,
        pageSize,
        basePath: '/categorias',
        query: req.query,
        errors: [{ msg: 'La categoría solicitada no existe.' }],
        returnTo: '/categorias',
        viewClass: 'view-productos'
      });
    }

    const categoria = categoriaRows[0];
    const [products] = await pool.query(
      `SELECT DISTINCT p.id, p.nombre, p.precio, p.stock, p.stock_minimo, l.id AS localizacion_id, l.nombre AS localizacion
       FROM productos p
       JOIN producto_categoria pc ON pc.producto_id = p.id
       LEFT JOIN localizaciones l ON l.id = p.localizacion_id
       WHERE pc.categoria_id = ?
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [data.id, pageSize, offset]
    );

    await enrichProductsWithRelations(products); // Añade categorías/proveedores a cada producto

    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM productos p
       JOIN producto_categoria pc ON pc.producto_id = p.id
       WHERE pc.categoria_id = ?`,
      [data.id]
    );
    const totalItems = countRows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    res.render('pages/productos/by-relation', {
      title: `Productos de la categoría: ${categoria.nombre}`,
      relation: { tipo: 'categoría', nombre: categoria.nombre, id: categoria.id, total: totalItems },
      items: products,
      page,
      totalPages,
      pageSize,
      basePath: `/categorias/${categoria.id}/productos`,
      query: req.query,
      errors: [],
      returnTo: resolveReturnTo(req, '/categorias'),
      viewClass: 'view-productos'
    });
  } catch (err) {
    console.error('[categorias] Error listando productos por categoría:', err);
    res.status(500).render('pages/productos/by-relation', {
      title: 'Error al listar productos',
      relation: null,
      items: [],
      page: 1,
      totalPages: 1,
      pageSize,
      basePath: '/categorias',
      query: req.query,
      errors: [{ msg: 'Ocurrió un problema al consultar la base de datos.' }],
      returnTo: resolveReturnTo(req, '/categorias'),
      viewClass: 'view-productos'
    });
  }
};
