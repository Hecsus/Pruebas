const pool = require('../config/db');

// Mostrar panel con contadores generales
exports.index = async (req, res) => {
  const isAdmin = req.session.user && req.session.user.rol === 'admin'; // Verifica si el usuario es admin
  const counts = {};                                                   // Objeto que acumula los totales
    const icons = {                                                     // Iconos Boxicons para cada tarjeta
      productos: 'bx bx-box',
      categorias: 'bx bx-list-ul',
      proveedores: 'bx bx-truck',
      localizaciones: 'bx bx-map',
      bajoStock: 'bx bx-error',
      usuarios: 'bx bx-user',
      admins: 'bx bx-user-check'
    };

  const [prod] = await pool.query('SELECT COUNT(*) AS n FROM productos');
  const [cat] = await pool.query('SELECT COUNT(*) AS n FROM categorias');
  const [prov] = await pool.query('SELECT COUNT(*) AS n FROM proveedores');
  const [loc] = await pool.query('SELECT COUNT(*) AS n FROM localizaciones');
  const [bajo] = await pool.query('SELECT COUNT(*) AS n FROM productos WHERE stock < stock_minimo');

  counts.productos = prod[0].n;
  counts.categorias = cat[0].n;
  counts.proveedores = prov[0].n;
  counts.localizaciones = loc[0].n;
  counts.bajoStock = bajo[0].n;

  if (isAdmin) {
    const [usr] = await pool.query('SELECT COUNT(*) AS n FROM usuarios');
    const [adm] = await pool.query("SELECT COUNT(*) AS n FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE r.nombre='admin'");
    counts.usuarios = usr[0].n;
    counts.admins = adm[0].n;
  }

  res.render('pages/panel', {
    title: 'Panel de inventario',
    counts,
    icons,
    isAdmin,
    viewClass: 'view-panel' // Clase de fondo para la vista
  });
};
