import { query } from '../../config/db.js';
import { buildWhere, updateById } from '../../utils/sql.js';

export const findById = async (id) => (await query('SELECT * FROM insumos WHERE id = ?', [id]))[0];

export const list = ({ activo, bajo_minimo, q } = {}) => {
  const { sql, params } = buildWhere([
    activo !== undefined && ['activo = ?', activo ? 1 : 0],
    bajo_minimo && ['stock <= stock_minimo'],
    q && ['nombre LIKE ?', `%${q}%`],
  ]);
  return query(`SELECT * FROM insumos ${sql} ORDER BY nombre`, params);
};

export const create = async ({ nombre, unidad, stock, stock_minimo }, run = query) =>
  (await run('INSERT INTO insumos (nombre, unidad, stock, stock_minimo) VALUES (?, ?, ?, ?)', [nombre, unidad, stock, stock_minimo])).insertId;

export const update = (id, fields) => updateById('insumos', id, fields);

// Funciones transaccionales: reciben `run` de withTransaction
export const lockById = async (id, run) => (await run('SELECT * FROM insumos WHERE id = ? FOR UPDATE', [id]))[0];
export const setStock = (id, stock, run) => run('UPDATE insumos SET stock = ? WHERE id = ?', [stock, id]);
export const addMovimiento = (m, run) => run(
  'INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, stock_resultante, pedido_id, usuario_id, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [m.insumo_id, m.tipo, m.cantidad, m.stock_resultante, m.pedido_id ?? null, m.usuario_id, m.motivo ?? null],
);

export const movimientos = (insumoId, limit) => query(
  `SELECT m.id, m.tipo, m.cantidad, m.stock_resultante, m.pedido_id, m.motivo, m.creado_en, u.nombre AS usuario
   FROM movimientos_inventario m JOIN usuarios u ON u.id = m.usuario_id
   WHERE m.insumo_id = ? ORDER BY m.id DESC LIMIT ${Number(limit)}`, [insumoId]);   // limit ya validado como entero

// Productos ACTIVOS cuya receta usa este insumo
export const productosQueLoUsan = (insumoId) => query(
  'SELECT p.nombre FROM recetas r JOIN productos p ON p.id = r.producto_id WHERE r.insumo_id = ? AND p.activo = 1', [insumoId]);
export const usadoEnRecetas = async (insumoId) =>
  (await query('SELECT COUNT(*) AS n FROM recetas WHERE insumo_id = ?', [insumoId]))[0].n > 0;
