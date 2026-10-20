import { query } from '../config/db.js';

// buildWhere([ cond && ['columna = ?', valor], ... ]) ignora las condiciones falsas/undefined
export const buildWhere = (conditions) => {
  const on = conditions.filter(Boolean);
  return { sql: on.length ? 'WHERE ' + on.map(([s]) => s).join(' AND ') : '', params: on.flatMap(([, ...p]) => p) };
};

// UPDATE de columnas dinámicas. Los nombres de columna salen del código (schemas strict), nunca del usuario.
export const updateById = async (table, id, fields, run = query) => {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  await run(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => fields[k]), id]);
};
