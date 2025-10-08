/**
 * Utilidades para enriquecer listados de productos con sus relaciones.
 * Objetivo: evitar repetir consultas para categorías y proveedores
 * cuando necesitamos mostrar tablas de productos filtradas por alguna
 * relación (categoría, proveedor, localización, etc.).
 */
const pool = require('../config/db'); // Pool de conexiones reutilizado en toda la app

/**
 * Adjunta categorías y proveedores a cada producto del array recibido.
 * @param {Array} products - Filas obtenidas de la base de datos (cada una con al menos la columna `id`).
 * @returns {Promise<Array>} El mismo array con propiedades `categorias` y `proveedores` rellenas.
 */
async function enrichProductsWithRelations(products) {
  // Si no hay productos no hacemos más consultas y devolvemos el array tal cual.
  if (!products.length) {
    products.forEach(p => {
      p.categorias = [];
      p.proveedores = [];
    });
    return products;
  }

  const ids = products.map(p => p.id); // IDs de productos a consultar en tablas puente

  // Mapa auxiliar para agrupar categorías por producto
  const categoriesByProduct = new Map();
  const [categoryRows] = await pool.query(
    `SELECT pc.producto_id, c.id, c.nombre
     FROM producto_categoria pc
     JOIN categorias c ON c.id = pc.categoria_id
     WHERE pc.producto_id IN (?)`,
    [ids]
  );
  categoryRows.forEach(row => {
    const list = categoriesByProduct.get(row.producto_id) || [];
    list.push({ id: row.id, nombre: row.nombre });
    categoriesByProduct.set(row.producto_id, list);
  });

  // Mapa auxiliar para agrupar proveedores por producto
  const providersByProduct = new Map();
  const [providerRows] = await pool.query(
    `SELECT pp.producto_id, pr.id, pr.nombre
     FROM producto_proveedor pp
     JOIN proveedores pr ON pr.id = pp.proveedor_id
     WHERE pp.producto_id IN (?)`,
    [ids]
  );
  providerRows.forEach(row => {
    const list = providersByProduct.get(row.producto_id) || [];
    list.push({ id: row.id, nombre: row.nombre });
    providersByProduct.set(row.producto_id, list);
  });

  // Inyectamos los arrays en cada producto del resultado original
  products.forEach(product => {
    product.categorias = categoriesByProduct.get(product.id) || [];
    product.proveedores = providersByProduct.get(product.id) || [];
  });

  return products;
}

module.exports = {
  enrichProductsWithRelations
};
