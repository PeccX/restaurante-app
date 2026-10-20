import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
  waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4',
  decimalNumbers: true,            // DECIMAL llega como número, no como string
});

// SELECT => filas; INSERT/UPDATE/DELETE => { insertId, affectedRows }. Siempre con parámetros (?), nunca concatenar.
export const query = async (sql, params = []) => (await pool.execute(sql, params))[0];

// Para operaciones de varios pasos (crear/cancelar pedido): todo o nada.
// fn recibe run(sql, params), que ejecuta DENTRO de la transacción.
export const withTransaction = async (fn) => {
  const conn = await pool.getConnection();
  const run = async (sql, params = []) => (await conn.execute(sql, params))[0];
  try {
    await conn.beginTransaction();
    const result = await fn(run);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
