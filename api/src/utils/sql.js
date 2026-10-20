import { query } from '../config/db.js';

// Ignora las condiciones falsas
export const buildWhere = (conditions) => {
  const on = conditions.filter(Boolean);
  return { sql: on.length ? 'WHERE ' + on.map(([s]) => s).join(' AND ') : '', params: on.flatMap(([, ...p]) => p) };
};

// Las columnas vienen de schemas strict, nunca del usuario
export const updateById = async (table, id, fields, run = query) => {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  await run(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => fields[k]), id]);
};
