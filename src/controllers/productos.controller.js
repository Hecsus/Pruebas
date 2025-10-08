const pool = require('../config/db');
const { validationResult, matchedData } = require('express-validator');
const { addNumericFilter } = require('../utils/sql'); // Helper para construir comparaciones numéricas seguras
// Utilidades de subida y acceso a imágenes
const { moveToProductImage, getProductImageUrl } = require('../utils/upload');
const validateReturnTo = require('../utils/returnTo'); // Sanitiza returnTo para evitar redirecciones externas
const { buildProductQR } = require('../utils/qrcode'); // Generación de QR de productos

// Listar productos con filtros, ordenación y paginación
exports.list = async (req, res) => {
  const errors = validationResult(req); // Validación de query params
  const data = matchedData(req, { locations: ['query'] }); // Datos saneados

  const page = parseInt(req.query.page) || 1; // Página actual
  const limit = 10;                           // Elementos por página
  const offset = (page - 1) * limit;          // Desplazamiento

  const SORTABLE = {
    id: 'p.id',
    nombre: 'p.nombre',
    precio: 'p.precio',
    costo: 'p.costo',
    stock: 'p.stock',
    stock_minimo: 'p.stock_minimo',
    localizacion: 'l.nombre'
  }; // Cualquier otra columna queda descartada

  const sortCol = SORTABLE[data.sortBy] || 'p.id';
  const sortDirSql = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const joins = [];   // Joins condicionales
  const clauses = []; // Condiciones WHERE
  const params = [];  // Valores parametrizados

  if (data.qName) {
    clauses.push('p.nombre LIKE ?');
    params.push(`%${data.qName}%`);
  }
  // Comparaciones numéricas: si hay valor y falta operador se asume '='
  addNumericFilter(clauses, params, 'p.precio', data.price, data.priceOp);
  addNumericFilter(clauses, params, 'p.stock', data.stock, data.stockOp);
  addNumericFilter(clauses, params, 'p.stock_minimo', data.min, data.minOp);
  if (data.localizacionId) {
    clauses.push('p.localizacion_id = ?');
    params.push(data.localizacionId);
  }
  if (data.categoriaId) {
    joins.push('JOIN producto_categoria pc ON pc.producto_id = p.id');
    clauses.push('pc.categoria_id = ?');
    params.push(data.categoriaId);
  }
  if (data.proveedorId) {
    joins.push('JOIN producto_proveedor pp ON pp.producto_id = p.id');
    clauses.push('pp.proveedor_id = ?');
    params.push(data.proveedorId);
  }
  if (data.low === '1') {
    clauses.push('p.stock < p.stock_minimo');
  }

  const whereSql = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const joinSql = joins.join(' ');
  const baseSql = `FROM productos p LEFT JOIN localizaciones l ON p.localizacion_id = l.id ${joinSql} ${whereSql}`;

  const [rows] = await pool.query(
    `SELECT DISTINCT p.*, l.id AS localizacion_id, l.nombre AS localizacion ${baseSql} ORDER BY ${sortCol} ${sortDirSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Obtiene categorías y proveedores relacionados para mostrar procedencia
  const ids = rows.map(r => r.id); // IDs de los productos listados
  const catsByProd = {};          // categorías por producto
  const provsByProd = {};         // proveedores por producto
  if (ids.length) {
    const [catRows] = await pool.query(
      'SELECT pc.producto_id, c.id, c.nombre FROM producto_categoria pc JOIN categorias c ON c.id = pc.categoria_id WHERE pc.producto_id IN (?)',
      [ids]
    );
    catRows.forEach(r => {
      (catsByProd[r.producto_id] ||= []).push({ id: r.id, nombre: r.nombre });
    });
    const [provRows] = await pool.query(
      'SELECT pp.producto_id, pr.id, pr.nombre FROM producto_proveedor pp JOIN proveedores pr ON pr.id = pp.proveedor_id WHERE pp.producto_id IN (?)',
      [ids]
    );
    provRows.forEach(r => {
      (provsByProd[r.producto_id] ||= []).push({ id: r.id, nombre: r.nombre });
    });
  }
  rows.forEach(p => {
    p.categorias = catsByProd[p.id] || [];
    p.proveedores = provsByProd[p.id] || [];
  });

  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total ${baseSql}`,
    params
  );

  const totalPages = Math.ceil(countRows[0].total / limit);

  const [localizaciones] = await pool.query('SELECT id, nombre FROM localizaciones');
  const [categorias] = await pool.query('SELECT id, nombre FROM categorias');
  const [proveedores] = await pool.query('SELECT id, nombre FROM proveedores');

  res.render('pages/productos/list', {
    title: 'Productos',            // Se usa en el <title> y encabezado
    basePath: '/productos',        // Ruta base para "Limpiar" y paginación
    productos: rows,              // Resultado de la consulta
    page,
    totalPages,
    localizaciones,
    categorias,
    proveedores,
    query: req.query,             // Valores actuales de los filtros para repoblar inputs
    errors: errors.array(),       // Errores de validación a mostrar en la vista
    viewClass: 'view-productos'   // Clase de fondo para la vista
  });
};

// Mostrar formulario de creación/edición
exports.form = async (req, res) => {
  const [categorias] = await pool.query('SELECT * FROM categorias');
  const [proveedores] = await pool.query('SELECT * FROM proveedores');
  const [localizaciones] = await pool.query('SELECT * FROM localizaciones');
  let producto = null;
  if (req.params.id) { // Si hay ID, estamos editando: precarga datos
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (rows.length) {
      producto = rows[0];
      const [pc] = await pool.query('SELECT categoria_id FROM producto_categoria WHERE producto_id=?', [req.params.id]);
      producto.categoriaIds = pc.map(r => r.categoria_id); // IDs de categorías actuales
      const [pp] = await pool.query('SELECT proveedor_id FROM producto_proveedor WHERE producto_id=?', [req.params.id]);
      producto.proveedorIds = pp.map(r => r.proveedor_id); // IDs de proveedores actuales
      // Imagen existente: derivar URL pública si el archivo está presente
      producto.imageUrl = getProductImageUrl(producto.id);
    }
  }
  const title = req.params.id ? 'Editar producto' : 'Nuevo producto';
  res.render('pages/productos/form', { title, producto, categorias, proveedores, localizaciones, returnTo: req.query.returnTo, errors: [], oldInput: null, viewClass: 'view-productos' });
};

// Crear producto
// Crear producto
// Propósito: inserta producto y asociaciones, opcionalmente guarda imagen.
// Entradas: campos del formulario, req.file (imagen opcional), returnTo.
// Salidas: redirige a listado o returnTo con mensaje flash.
// Validación: usa express-validator; si falla, re-renderiza con errores.
// Errores: rollback de transacción y despliegue de mensaje.
exports.create = async (req, res) => {
  const errors = validationResult(req);
  const [categorias] = await pool.query('SELECT * FROM categorias');
  const [proveedores] = await pool.query('SELECT * FROM proveedores');
  const [localizaciones] = await pool.query('SELECT * FROM localizaciones');
  if (!errors.isEmpty()) {
    return res.render('pages/productos/form', { title: 'Nuevo producto', producto: null, categorias, proveedores, localizaciones, returnTo: req.body.returnTo, errors: errors.array(), oldInput: req.body, viewClass: 'view-productos' });
  }

  const { nombre, descripcion, precio, costo, stock, stock_minimo, observaciones, localizacion_id, returnTo, categoriaIds = [], proveedorIds = [] } = req.body; // Datos del formulario
  const categoriasArr = Array.isArray(categoriaIds) ? categoriaIds : (categoriaIds ? [categoriaIds] : []);
  const proveedoresArr = Array.isArray(proveedorIds) ? proveedorIds : (proveedorIds ? [proveedorIds] : []);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.execute(
      'INSERT INTO productos (nombre, descripcion, precio, costo, stock, stock_minimo, observaciones, localizacion_id) VALUES (?,?,?,?,?,?,?,?)',
      [nombre, descripcion, precio, costo, stock, stock_minimo, observaciones, localizacion_id]
    );
    const prodId = r.insertId;
    // Si se subió imagen, moverla al destino final con nombre <id>.<ext>
    if (req.file) moveToProductImage(req.file, prodId);

    for (const cid of categoriasArr) {
      await conn.query('INSERT INTO producto_categoria (producto_id, categoria_id) VALUES (?,?)', [prodId, cid]);
    }
    for (const pid of proveedoresArr) {
      await conn.query('INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES (?,?)', [prodId, pid]);
    }

    await conn.commit();
    req.session.flash = { type: 'success', message: 'Producto creado con éxito.' };
    // Redirección segura: solo rutas internas válidas
    res.redirect(validateReturnTo(returnTo));
  } catch (e) {
    await conn.rollback();
    res.render('pages/productos/form', { title: 'Nuevo producto', producto: null, categorias, proveedores, localizaciones, returnTo: req.body.returnTo, errors: [{ msg: e.message }], oldInput: req.body, viewClass: 'view-productos' });
  } finally {
    conn.release();
  }
};

// Editar producto
// Editar producto
// Propósito: actualiza datos y asociaciones; reemplaza imagen si se sube otra.
// Entradas: id en params, campos del formulario, req.file opcional, returnTo.
// Salidas: redirige a listado o returnTo con mensaje flash.
// Validación: express-validator; en error se muestran mensajes.
// Errores: rollback de transacción y re-render con datos actuales.
exports.update = async (req, res) => {
  const errors = validationResult(req);
  const id = req.params.id;
  const [categorias] = await pool.query('SELECT * FROM categorias');
  const [proveedores] = await pool.query('SELECT * FROM proveedores');
  const [localizaciones] = await pool.query('SELECT * FROM localizaciones');
  if (!errors.isEmpty()) {
    const [rows] = await pool.query('SELECT * FROM productos WHERE id=?', [id]);
    return res.render('pages/productos/form', { title: 'Editar producto', producto: rows[0], categorias, proveedores, localizaciones, returnTo: req.body.returnTo, errors: errors.array(), oldInput: req.body, viewClass: 'view-productos' });
  }
  const { nombre, descripcion, precio, costo, stock, stock_minimo, observaciones, localizacion_id, returnTo, categoriaIds = [], proveedorIds = [] } = req.body; // Datos normalizados
  const categoriasArr = Array.isArray(categoriaIds) ? categoriaIds : (categoriaIds ? [categoriaIds] : []);
  const proveedoresArr = Array.isArray(proveedorIds) ? proveedorIds : (proveedorIds ? [proveedorIds] : []);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE productos SET nombre=?, descripcion=?, precio=?, costo=?, stock=?, stock_minimo=?, observaciones=?, localizacion_id=? WHERE id=?',
      [nombre, descripcion, precio, costo, stock, stock_minimo, observaciones, localizacion_id, id]);
    await conn.query('DELETE FROM producto_categoria WHERE producto_id=?', [id]);
    for (const cid of categoriasArr) {
      await conn.query('INSERT INTO producto_categoria (producto_id, categoria_id) VALUES (?,?)', [id, cid]);
    }
    await conn.query('DELETE FROM producto_proveedor WHERE producto_id=?', [id]);
    for (const pid of proveedoresArr) {
      await conn.query('INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES (?,?)', [id, pid]);
    }
    await conn.commit();
    // Si hay archivo nuevo, moverlo y limpiar otras extensiones
    if (req.file) moveToProductImage(req.file, id);
    req.session.flash = { type: 'success', message: 'Producto actualizado.' };
    // Redirección con returnTo validado
    res.redirect(validateReturnTo(returnTo));
  } catch (e) {
    await conn.rollback();
    const [rows] = await pool.query('SELECT * FROM productos WHERE id=?', [id]);
    res.render('pages/productos/form', { title: 'Editar producto', producto: rows[0], categorias, proveedores, localizaciones, returnTo: req.body.returnTo, errors: [{ msg: e.message }], oldInput: req.body, viewClass: 'view-productos' });
  } finally {
    conn.release();
  }
};

// Eliminar producto
exports.remove = async (req, res) => {
  const { returnTo } = req.body;
  await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
  // Redirige a una ruta interna segura
  res.redirect(validateReturnTo(returnTo));
};

// Listado de productos con stock por debajo del mínimo.
// Entradas: filtros opcionales en req.query validados por listFilters.
// Salidas: renderiza tabla filtrada en pages/productos/bajoStock.ejs.
// Seguridad: consultas parametrizadas y sin redirección externa.
exports.bajoStock = async (req, res) => {
  const errors = validationResult(req);           // Resultado de validaciones
  const data = matchedData(req, { locations: ['query'] }); // Datos saneados

  const page = parseInt(req.query.page) || 1;     // Página actual
  const limit = 10;                               // Registros por página
  const offset = (page - 1) * limit;              // Desplazamiento para SQL

  const SORTABLE = {                              // Whitelist de columnas ordenables
    id: 'p.id',
    nombre: 'p.nombre',
    precio: 'p.precio',
    costo: 'p.costo',
    stock: 'p.stock',
    stock_minimo: 'p.stock_minimo',
    localizacion: 'l.nombre'
  };

  const sortCol = SORTABLE[data.sortBy] || 'p.id';
  const sortDirSql = (data.sortDir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const joins = [];                       // Posibles joins según filtros
  const clauses = ['p.stock <= p.stock_minimo']; // Filtro fijo de bajo stock
  const params = [];                      // Valores parametrizados

  if (data.qName) {
    clauses.push('p.nombre LIKE ?');
    params.push(`%${data.qName}%`);
  }
  addNumericFilter(clauses, params, 'p.precio', data.price, data.priceOp);
  addNumericFilter(clauses, params, 'p.stock', data.stock, data.stockOp);
  addNumericFilter(clauses, params, 'p.stock_minimo', data.min, data.minOp);
  if (data.localizacionId) {
    clauses.push('p.localizacion_id = ?');
    params.push(data.localizacionId);
  }
  if (data.categoriaId) {
    joins.push('JOIN producto_categoria pc ON pc.producto_id = p.id');
    clauses.push('pc.categoria_id = ?');
    params.push(data.categoriaId);
  }
  if (data.proveedorId) {
    joins.push('JOIN producto_proveedor pp ON pp.producto_id = p.id');
    clauses.push('pp.proveedor_id = ?');
    params.push(data.proveedorId);
  }

  const whereSql = 'WHERE ' + clauses.join(' AND ');
  const joinSql = joins.join(' ');
  const baseSql = `FROM productos p LEFT JOIN localizaciones l ON p.localizacion_id = l.id ${joinSql} ${whereSql}`;

  const [rows] = await pool.query(
    `SELECT DISTINCT p.*, l.id AS localizacion_id, l.nombre AS localizacion ${baseSql} ORDER BY ${sortCol} ${sortDirSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const ids = rows.map(r => r.id);
  const catsByProd = {};
  const provsByProd = {};
  if (ids.length) {
    const [catRows] = await pool.query(
      'SELECT pc.producto_id, c.id, c.nombre FROM producto_categoria pc JOIN categorias c ON c.id = pc.categoria_id WHERE pc.producto_id IN (?)',
      [ids]
    );
    catRows.forEach(r => { (catsByProd[r.producto_id] ||= []).push({ id: r.id, nombre: r.nombre }); });
    const [provRows] = await pool.query(
      'SELECT pp.producto_id, pr.id, pr.nombre FROM producto_proveedor pp JOIN proveedores pr ON pr.id = pp.proveedor_id WHERE pp.producto_id IN (?)',
      [ids]
    );
    provRows.forEach(r => { (provsByProd[r.producto_id] ||= []).push({ id: r.id, nombre: r.nombre }); });
  }
  rows.forEach(p => {
    p.categorias = catsByProd[p.id] || [];
    p.proveedores = provsByProd[p.id] || [];
  });

  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total ${baseSql}`,
    params
  );
  const totalPages = Math.ceil(countRows[0].total / limit);

  const [localizaciones] = await pool.query('SELECT id, nombre FROM localizaciones');
  const [categorias] = await pool.query('SELECT id, nombre FROM categorias');
  const [proveedores] = await pool.query('SELECT id, nombre FROM proveedores');

  res.render('pages/productos/bajoStock', {
    title: 'Bajo stock',
    basePath: '/bajo-stock',
    productos: rows,
    page,
    totalPages,
    localizaciones,
    categorias,
    proveedores,
    query: req.query,
    errors: errors.array(),
    viewClass: 'view-bajo-stock'
  });
};

// Detalle de producto
// Propósito: mostrar ficha completa con imagen y QR.
// Entradas: req.params.id (numérico), query.returnTo.
// Salidas: renderiza vista detalle con imageUrl y qrDataUrl.
// Seguridad: solo expone datos públicos del inventario.
exports.detail = async (req, res) => {
  const id = req.params.id;
  const [rows] = await pool.query(
    `SELECT p.*, l.id AS localizacion_id, l.nombre AS localizacion FROM productos p LEFT JOIN localizaciones l ON p.localizacion_id = l.id WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return res.redirect('/productos');
  const producto = rows[0];
  const [cats] = await pool.query(
    `SELECT c.* FROM categorias c JOIN producto_categoria pc ON c.id = pc.categoria_id WHERE pc.producto_id = ?`,
    [id]
  );
  const [provs] = await pool.query(
    `SELECT pr.* FROM proveedores pr JOIN producto_proveedor pp ON pr.id = pp.proveedor_id WHERE pp.producto_id = ?`,
    [id]
  );
  producto.categorias = cats;
  producto.proveedores = provs;
  const isBajoStock = producto.stock < producto.stock_minimo; // Calcula si está por debajo del mínimo
  // URL pública de imagen (o null si no hay)
  const imageUrl = getProductImageUrl(id);
  // QR con datos esenciales para etiquetado rápido
  const urlDetalle = `/productos/${id}`;
  const qrDataUrl = await buildProductQR({ ...producto, url: urlDetalle });
  res.render('pages/productos/detail', {
    title: 'Detalle de producto',
    producto,
    returnTo: req.query.returnTo,
    imageUrl,
    isBajoStock,
    qrDataUrl,
    viewClass: 'view-productos'
  });
};

// Vista imprimible del QR
// Propósito: generar un A6 con código QR y datos mínimos.
// Entradas: req.params.id.
// Salidas: HTML simple sin navbar ni footer.
// Seguridad: QR contiene información no sensible del inventario.
exports.qr = async (req, res) => {
  const id = req.params.id;
  const [rows] = await pool.query(
    `SELECT p.*, l.id AS localizacion_id, l.nombre AS localizacion FROM productos p LEFT JOIN localizaciones l ON p.localizacion_id = l.id WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return res.redirect('/productos');
  const producto = rows[0];
  const [cats] = await pool.query(
    `SELECT c.* FROM categorias c JOIN producto_categoria pc ON c.id = pc.categoria_id WHERE pc.producto_id = ?`,
    [id]
  );
  const [provs] = await pool.query(
    `SELECT pr.* FROM proveedores pr JOIN producto_proveedor pp ON pr.id = pp.proveedor_id WHERE pp.producto_id = ?`,
    [id]
  );
  producto.categorias = cats;
  producto.proveedores = provs;
  const urlDetalle = `/productos/${id}`;
  const qrDataUrl = await buildProductQR({ ...producto, url: urlDetalle });
  res.render('pages/productos/qr', {
    title: 'QR del producto',
    producto,
    qrDataUrl,
    hideChrome: true,
    viewClass: 'd-flex justify-content-center align-items-center'
  });
};
// [checklist] Requisito implementado | Validación aplicada | SQL parametrizado (si aplica) | Comentarios modo curso | Sin código muerto
