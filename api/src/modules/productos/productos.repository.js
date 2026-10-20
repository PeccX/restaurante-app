import { query } from '../../config/db.js';
import { buildWhere, updateById } from '../../utils/sql.js';

// porciones = cuántas unidades se pueden preparar con el stock actual (NULL si no tiene receta)
const SELECT = `SELECT p.*, v.porciones FROM productos p LEFT JOIN v_porciones_disponibles v ON v.producto_id = p.id`;

export const findById = async (id) => (await query(`${SELECT} WHERE p.id = ?`, [id]))[0];
export const findByNombre = async (nombre) => (await query('SELECT id FROM productos WHERE nombre = ?', [nombre]))[0];

export const list = ({ activo, categoria, q } = {}) => {
  const { sql, params } = buildWhere([
    activo !== undefined && ['p.activo = ?', activo ? 1 : 0],
    categoria && ['p.categoria = ?', categoria],
    q && ['p.nombre LIKE ?', `%${q}%`],
  ]);
  return query(`${SELECT} ${sql} ORDER BY p.categoria, p.nombre`, params);
};

export const getReceta = (productoId) => query(
  `SELECT r.insumo_id, i.nombre AS insumo, i.unidad, r.cantidad
   FROM recetas r JOIN insumos i ON i.id = r.insumo_id WHERE r.producto_id = ? ORDER BY i.nombre`, [productoId]);

// Insumos que existen y están activos, de la lista dada (para validar la receta)
export const insumosActivos = async (ids) => {
  if (!ids.length) return [];
  return query(`SELECT id FROM insumos WHERE activo = 1 AND id IN (${ids.map(() => '?').join(',')})`, ids);
};

// Funciones transaccionales (reciben `run`)
export const create = async ({ nombre, categoria, precio }, run) =>
  (await run('INSERT INTO productos (nombre, categoria, precio) VALUES (?, ?, ?)', [nombre, categoria, precio])).insertId;
export const update = (id, fields, run) => updateById('productos', id, fields, run);
export const replaceReceta = async (productoId, receta, run) => {
  await run('DELETE FROM recetas WHERE producto_id = ?', [productoId]);
  for (const { insumo_id, cantidad } of receta)
    await run('INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)', [productoId, insumo_id, cantidad]);
};
