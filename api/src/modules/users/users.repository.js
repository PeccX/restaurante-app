import { query } from '../../config/db.js';
import { buildWhere, updateById } from '../../utils/sql.js';

// Solo SQL. Nunca devuelve password_hash, salvo findByEmail (lo necesita el login).
const PUBLIC = 'id, nombre, email, rol, activo, creado_en';

export const findById = async (id) => (await query(`SELECT ${PUBLIC} FROM usuarios WHERE id = ?`, [id]))[0];
export const findByEmail = async (email) => (await query('SELECT * FROM usuarios WHERE email = ?', [email]))[0];

export const list = ({ activo, q } = {}) => {
  const { sql, params } = buildWhere([
    activo !== undefined && ['activo = ?', activo ? 1 : 0],
    q && ['(nombre LIKE ? OR email LIKE ?)', `%${q}%`, `%${q}%`],
  ]);
  return query(`SELECT ${PUBLIC} FROM usuarios ${sql} ORDER BY id`, params);
};

export const create = async ({ nombre, email, password_hash, rol }) =>
  (await query('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)', [nombre, email, password_hash, rol])).insertId;

export const update = (id, fields) => updateById('usuarios', id, fields);
