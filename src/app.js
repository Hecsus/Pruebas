/**
 * Archivo principal del servidor Express.
 * Cada línea describe qué hace y por qué se incluye.
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();               // Carga variables de entorno desde .env en desarrollo/test
}

const REQUIRED_ENV = ['SESSION_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = REQUIRED_ENV.filter((key) => process.env[key] === undefined);
if (missing.length > 0) {
  console.error(`[App] Faltan variables de entorno: ${missing.join(', ')}. Revisa .env o configura las variables en el servidor.`);
  process.exit(1); // Evita continuar con configuración incompleta
}

const fs = require('fs');                 // Operaciones con el sistema de archivos (crear /uploads si falta)
const path = require('path');             // Módulo nativo para resolver rutas en distintos SO
const express = require('express');       // Framework que simplifica la creación del servidor HTTP
const ejsLayouts = require('express-ejs-layouts'); // Permite reutilizar layouts en las vistas EJS
const cookieSession = require('cookie-session');   // Gestión de sesiones basada en cookies (producción)
const expressSession = require('express-session'); // Gestión de sesiones en memoria/file (desarrollo)

const requireAuth = require('./middlewares/requireAuth'); // Middleware que exige autenticación para ciertas rutas
const requireRole = require('./middlewares/requireRole'); // Middleware que limita acceso según rol del usuario

const authRoutes = require('./routes/auth.routes');               // Conjunto de rutas de autenticación
const panelRoutes = require('./routes/panel.routes');             // Conjunto de rutas del panel de inventario
const productosRoutes = require('./routes/productos.routes');     // Rutas de productos y bajo stock
const categoriasRoutes = require('./routes/categorias.routes');   // Conjunto de rutas CRUD de categorías
const proveedoresRoutes = require('./routes/proveedores.routes'); // Conjunto de rutas CRUD de proveedores
const localizacionesRoutes = require('./routes/localizaciones.routes'); // Conjunto de rutas CRUD de localizaciones
const usuariosRoutes = require('./routes/usuarios.routes');       // Conjunto de rutas CRUD de usuarios
const db = require('./config/db');                                // Pool de conexiones MySQL reutilizable

const app = express();                           // Crea la instancia de Express
app.disable('x-powered-by');                     // Oculta cabecera que delata Express

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;           // Puerto tomado de .env o 3000 por defecto

if (!process.env.SESSION_SECRET) {               // Validación explícita para el secreto de sesión
  console.error('[App] SESSION_SECRET es obligatorio para firmar las cookies de sesión.');
  process.exit(1);
}

if (isProduction) {
  app.set('trust proxy', 1);                     // Render/Clever usan proxy inverso; necesario para cookies seguras
}

app.set('view engine', 'ejs');                   // Configura EJS como motor de plantillas
app.set('views', path.join(__dirname, 'views')); // Establece la carpeta de vistas
app.use(ejsLayouts);                             // Habilita el uso de layouts
app.set('layout', 'layouts/layout');             // Layout por defecto a utilizar

app.use(express.urlencoded({ extended: false })); // Parseo de formularios (application/x-www-form-urlencoded)

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true }); // Garantiza que /uploads exista incluso en contenedores efímeros
}

// Servimos archivos estáticos (CSS, JS, imágenes) bajo /public, /resources y las imágenes de productos bajo /uploads.
app.use('/public', express.static(publicDir));
app.use('/resources', express.static(publicDir));
app.use('/uploads', express.static(uploadsDir)); // ⚠️ En Render/Clever el almacenamiento local es efímero; mover a S3/Cloudinary en producción real

const sessionMiddleware = isProduction
  ? cookieSession({
      name: 'session',
      keys: [process.env.SESSION_SECRET],
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 1000 * 60 * 60
    })
  : expressSession({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60
      }
    });

app.use(sessionMiddleware);

app.use((req, res, next) => {                   // Middleware que gestiona mensajes flash
  const sessionData = req.session || {};
  res.locals.flash = sessionData.flash || null; // Guardamos mensajes temporales en res.locals
  if (sessionData.flash) {
    delete sessionData.flash;                   // Evita mostrar el mismo flash varias veces
  }
  next();
});

app.use((req, res, next) => {                                   // Middleware pedagógico: define defaults sin pisar personalizados
  res.locals.hideChrome =                                         // Usamos el valor previo si ya es booleano
    (typeof res.locals.hideChrome === 'boolean') ? res.locals.hideChrome : false; // Caso contrario lo fijamos a false (navbar visible)
  res.locals.viewClass = res.locals.viewClass || '';                // viewClass vacío evita clases undefined en <main>
  res.locals.activePath = req.path;                                // Guardamos la ruta actual para resaltar navegación
  next();                                                           // Continuamos con el flujo de middlewares
});

app.use((req, res, next) => {                     // Middleware que expone datos de sesión y ruta actual
  const sessionData = req.session || {};
  res.locals.currentPath = req.path;              // Ruta actual para resaltar enlaces activos
  res.locals.isAuthenticated = !!sessionData.user; // Booleano con estado de autenticación
  res.locals.userName = sessionData.user ? sessionData.user.nombre : null; // Nombre del usuario
  res.locals.userRole = sessionData.user ? sessionData.user.rol : null;    // Rol del usuario logueado
  res.locals.request = req;                      // Objeto de la petición disponible en las vistas
  next();                                         // Continúa con el siguiente middleware
});

app.get('/', requireAuth, (req, res) => {         // Página principal protegida por login
  res.redirect('/panel');                        // Redirige al panel de inventario
});

app.get('/health', (req, res) => {                // Endpoint simple para monitorear el servidor
  res.json({ ok: true });                         // Respuesta compatible con plataformas de health check
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
