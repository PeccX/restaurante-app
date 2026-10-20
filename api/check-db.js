import 'dotenv/config';
import mysql from 'mysql2/promise';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
console.log(`Conectando a ${DB_HOST}:${DB_PORT} como ${DB_USER}, base ${DB_NAME}`);
try {
  const c = await mysql.createConnection({ host: DB_HOST, port: +DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  const [r] = await c.query('SELECT COUNT(*) AS usuarios FROM usuarios');
  console.log('OK. Usuarios en la BD:', r[0].usuarios);
  await c.end();
} catch (e) {
  console.log('ERROR:', e.code, '-', e.message);
}