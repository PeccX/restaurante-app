import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
  waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4',
  decimalNumbers: true,            // DECIMAL como número, no string
  timezone: env.DB_TIMEZONE,
});
// Misma zona en la sesión: DATE() y CURRENT_TIMESTAMP en hora local
pool.pool.on('connection', (conn) => conn.query(`SET time_zone = '${env.DB_TIMEZONE}'`));

export const query = async (sql, params = []) => (await pool.execute(sql, params))[0];

// Reintenta solo en deadlock (1213); fn debe poder repetirse
const RETRYABLE = new Set([1213]);
export const withTransaction = async (fn, attempts = 3) => {
  for (let n = 1; ; n++) {
    const conn = await pool.getConnection();
    const run = async (sql, params = []) => (await conn.execute(sql, params))[0];
    try {
      await conn.beginTransaction();
      const result = await fn(run);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (!RETRYABLE.has(err.errno) || n >= attempts) throw err;
    } finally {
      conn.release();
    }
  }
};
