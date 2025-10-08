/**
 * Archivo principal del servidor Express.
 * Cada línea describe qué hace y por qué se incluye.
 */

require('dotenv').config();               // Carga variables de entorno desde .env

// Verifica que las variables críticas estén presentes; si falta alguna se aborta el arranque
const REQUIRED_ENV = ['PORT', 'SESSION_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const k of REQUIRED_ENV) {
  if (process.env[k] === undefined) {        // Permite cadenas vacías (ej: DB_PASSWORD '')
    console.error(`[App] Falta variable de entorno: ${k}`);
    process.exit(1); // Evita continuar con configuración incompleta
  }
}

const path = require('path');             // Módulo nativo para resolver rutas en distintos SO
const express = require('express');       // Framework que simplifica la creación del servidor HTTP
const ejsLayouts = require('express-ejs-layouts'); // Permite reutilizar layouts en las vistas EJS
const session = require('express-session'); // Gestión de sesiones en memoria (desarrollo)

const requireAuth = require('./middlewares/requireAuth'); // Middleware que exige autenticación para ciertas rutas
const requireRole = require('./middlewares/requireRole'); // Middleware que limita acceso según rol del usuario

const authRoutes = require('./routes/auth.routes');               // Conjunto de rutas de autenticación
const panelRoutes = require('./routes/panel.routes');             // Conjunto de rutas del panel de inventario
const productosRoutes = require('./routes/productos.routes');     // Rutas de productos y bajo stock
const categoriasRoutes = require('./routes/categorias.routes');   // Conjunto de rutas CRUD de categorías
const proveedoresRoutes = require('./routes/proveedores.routes'); // Conjunto de rutas CRUD de proveedores
const localizacionesRoutes = require('./routes/localizaciones.routes'); // Conjunto de rutas CRUD de localizaciones
const usuariosRoutes = require('./routes/usuarios.routes');     // Conjunto de rutas CRUD de usuarios
const db = require('./config/db');                                // Pool de conexiones MySQL reutilizable

const app = express();                           // Crea la instancia de Express
app.disable('x-powered-by');                     // Oculta cabecera que delata Express
const PORT = Number(process.env.PORT);           // Puerto tomado de .env; validado arriba

app.set('view engine', 'ejs');                   // Configura EJS como motor de plantillas
app.set('views', path.join(__dirname, 'views')); // Establece la carpeta de vistas
app.use(ejsLayouts);                             // Habilita el uso de layouts
app.set('layout', 'layouts/layout');             // Layout por defecto a utilizar

app.use(express.urlencoded({ extended: false })); // Parseo de formularios (application/x-www-form-urlencoded)

// Servimos archivos estáticos (CSS, JS, imágenes) bajo /resources y las imágenes de productos bajo /uploads.
app.use('/resources', express.static(path.join(__dirname, 'public'))); // Recursos estáticos generales
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'))); // Acceso directo a /uploads/products

/*
 * Por qué usamos express-session@^1.18.0:
 * - Versiones antiguas podían depender indirectamente de 'uid2' a través de otras piezas.
 * - La 1.18.0 usa 'uid-safe' internamente para generar IDs de sesión.
 * Configuración:
 * - secret: clave para firmar la cookie de sesión (tomada de .env).
 * - resave/saveUninitialized: banderas recomendadas.
 * - cookie: ajustes seguros básicos.
 */
app.use(session({
  secret: process.env.SESSION_SECRET,             // Clave para firmar la cookie; viene de .env
  resave: false,                                 // No fuerza resalvado si no hay cambios
  saveUninitialized: false,                      // No guarda sesiones vacías
  cookie: {
    httpOnly: true,                              // Evita acceso desde JS del cliente
    sameSite: 'lax',                             // Mitiga CSRF básico permitiendo navegación propia
    secure: process.env.NODE_ENV === 'production', // Requiere HTTPS en producción
    maxAge: 1000 * 60 * 60                       // Expira en una hora
  }
}));

app.use((req, res, next) => {                   // Middleware que gestiona mensajes flash
  // Guardamos mensajes temporales en req.session.flash y los exponemos en res.locals.flash
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.use((req, res, next) => {                                   // Middleware pedagógico: define defaults sin pisar personalizados
  res.locals.hideChrome =                                           // Usamos el valor previo si ya es booleano
    (typeof res.locals.hideChrome === 'boolean') ? res.locals.hideChrome : false; // Caso contrario lo fijamos a false (navbar visible)
  res.locals.viewClass = res.locals.viewClass || '';                // viewClass vacío evita clases undefined en <main>
  res.locals.activePath = req.path;                                // Guardamos la ruta actual para resaltar navegación
  next();                                                           // Continuamos con el flujo de middlewares
});

app.use((req, res, next) => {                     // Middleware que expone datos de sesión y ruta actual
  res.locals.currentPath = req.path;              // Ruta actual para resaltar enlaces activos
  res.locals.isAuthenticated = !!req.session.user; // Booleano con estado de autenticación
  res.locals.userName = req.session.user ? req.session.user.nombre : null; // Nombre del usuario
  res.locals.userRole = req.session.user ? req.session.user.rol : null;    // Rol del usuario logueado
  res.locals.request = req;                      // Objeto de la petición disponible en las vistas
  next();                                         // Continúa con el siguiente middleware
});

app.get('/', requireAuth, (req, res) => {         // Página principal protegida por login
  res.redirect('/panel');                        // Redirige al panel de inventario
});

app.get('/health', (req, res) => {                // Endpoint simple para monitorear el servidor
  res.json({ status: 'ok' });                     // Devuelve JSON indicando que está vivo
});

app.get('/db-health', async (req, res) => {       // Verifica conexión con la base de datos
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result'); // Consulta trivial para testear
    res.json({ ok: true, result: rows[0].result });          // Respuesta si la DB responde
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message }); // Respuesta de error si la consulta falla
  }
});

app.use('/', authRoutes);                         // Monta rutas de login/logout
app.use('/panel', requireAuth, panelRoutes);      // Panel de inventario con métricas
// Rutas de productos (CRUD completo)
app.use('/productos', productosRoutes.productosRouter);
// Listado específico de productos con stock bajo
app.use('/bajo-stock', productosRoutes.bajoStockRouter);
app.use('/categorias', requireAuth, categoriasRoutes);    // CRUD de categorías (protección por login)
app.use('/proveedores', requireAuth, proveedoresRoutes);  // CRUD de proveedores (protección por login)
app.use('/localizaciones', requireAuth, localizacionesRoutes); // CRUD de localizaciones (protección por login)
app.use('/usuarios', requireAuth, requireRole('admin'), usuariosRoutes); // CRUD de usuarios (solo admin)

app.listen(PORT, () => {                          // Arranca el servidor
  console.log(`Servidor escuchando en http://localhost:${PORT}`); // Mensaje de inicio en consola
});
