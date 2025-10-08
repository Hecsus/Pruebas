// Utilidad para generar QR (modo curso, comentado)
const QRCode = require('qrcode');

/**
 * buildProductQR: genera un DataURL PNG con datos clave del producto
 * @param {object} p - producto con campos: id, nombre, precio, costo, stock, stock_minimo, categorias[], proveedores[], localizacion, url
 * @returns {Promise<string>} dataURL (image/png;base64)
 */
async function buildProductQR(p){
  // Compactamos la info para lectura rápida desde móvil
  const payload = {
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    costo: p.costo,
    stock: p.stock,
    min: p.stock_minimo,
    categorias: p.categorias || [],
    proveedores: p.proveedores || [],
    loc: p.localizacion || null,
    url: p.url || null
  };
  const text = JSON.stringify(payload);
  // Tamaño cómodo para imprimir en A6
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', scale: 8, margin: 2 });
}

module.exports = { buildProductQR };
