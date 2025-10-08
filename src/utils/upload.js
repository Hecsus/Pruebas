// Módulo de subida de imágenes con Multer 2.x (comentado para aprender)
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 1) Carpeta temporal para subidas
const tmpDir = path.join(__dirname, '..', 'public', 'uploads', 'tmp');
// 2) Asegurar que la carpeta existe
fs.mkdirSync(tmpDir, { recursive: true });

// 3) Configuración de Multer 2.x: usamos 'dest' para que cree nombres temporales seguros
//    Cambio frente a 1.x: require Node 18+ y retorna Promises; la API upload.single('imagen') se mantiene
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    // Validar por MIME; Multer 2.x expone file.mimetype igual que 1.x
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(null, ok);
  }
});

// 4) Utilidad para mover el archivo temporal al destino final con nombre <id>.<ext>
function moveToProductImage(file, productId) {
  if (!file) return null; // No se subió nada
  const pathPublic = path.join(__dirname, '..', 'public', 'uploads', 'products');
  fs.mkdirSync(pathPublic, { recursive: true });

  // Derivar extensión desde mimetype
  const ext = file.mimetype === 'image/png' ? '.png'
            : file.mimetype === 'image/webp' ? '.webp'
            : '.jpg'; // por defecto jpeg → .jpg

  const finalPath = path.join(pathPublic, `${productId}${ext}`);

  // Si existen otras extensiones del mismo id, eliminarlas (evitar duplicados)
  ['.jpg', '.jpeg', '.png', '.webp'].forEach(e => {
    const p = path.join(pathPublic, `${productId}${e}`);
    if (fs.existsSync(p) && p !== finalPath) {
      try { fs.unlinkSync(p); } catch {}
    }
  });

  // Mover/renombrar archivo desde tmp
  fs.renameSync(file.path, finalPath);
  return finalPath; // ruta absoluta en disco
}

// 5) Utilidad para obtener la URL pública si existe alguna imagen del producto
function getProductImageUrl(productId) {
  const base = `/uploads/products`; // Ruta pública estática para las imágenes
  const pathPublic = path.join(__dirname, '..', 'public', 'uploads', 'products');
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(pathPublic, `${productId}${ext}`);
    if (fs.existsSync(p)) return `${base}/${productId}${ext}`;
  }
  return null;
}

module.exports = { upload, moveToProductImage, getProductImageUrl };
