require('dotenv').config(); // Carga variables de entorno para obtener credenciales de la base de datos

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']; // Variables obligatorias para conectar
for (const k of required) { // Recorre la lista de claves esperadas
  if (process.env[k] === undefined) { // Si falta alguna variable
    throw new Error(`[Config] Falta variable de entorno: ${k}. Crea .env en la raíz y rellénala.`); // Interrumpe la ejecución para evitar configuraciones erróneas
  }
}

const mysql = require('mysql2/promise'); // Librería MySQL con soporte de promesas para usar async/await

const pool = mysql.createPool({ // Crea un pool de conexiones reutilizable
  host: process.env.DB_HOST, // Host del servidor de base de datos
  user: process.env.DB_USER, // Usuario con el que conectarse
  password: process.env.DB_PASSWORD, // Contraseña del usuario
  database: process.env.DB_NAME, // Base de datos a utilizar
  waitForConnections: true, // Espera en cola si no hay conexiones disponibles
  connectionLimit: 10, // Número máximo de conexiones simultáneas
  queueLimit: 0, // Tamaño de cola infinito para peticiones
});

(async () => { // IIFE para comprobar la conexión al iniciar la app
  try {
    const conn = await pool.getConnection(); // Solicita una conexión del pool
    await conn.ping(); // Realiza un ping simple para verificar que la conexión funciona
    console.log('DB OK'); // Mensaje informativo de éxito
    conn.release(); // Libera la conexión de vuelta al pool
  } catch (err) {
    console.error('Error al conectar con la base de datos:', err.message); // Informa en consola si hay fallo
  }
})();

module.exports = pool; // Exporta el pool para ser usado en otros módulos
