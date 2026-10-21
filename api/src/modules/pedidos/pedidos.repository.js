import { query } from '../../config/db.js';
import { buildWhere, updateById } from '../../utils/sql.js';

const SELECT = `SELECT p.id, p.mesa_id, m.numero AS mesa, p.usuario_id, u.nombre AS mesero, p.num_comensales,
                       p.estado, p.total, p.notas, p.creado_en, p.actualizado_en,
                       p.pagado_en, p.metodo_pago, (p.pagado_en IS NOT NULL) AS pagado
                FROM pedidos p JOIN mesas m ON m.id = p.mesa_id JOIN usuarios u ON u.id = p.usuario_id`;

export const findById = async (id) => (await query(`${SELECT} WHERE p.id = ?`, [id]))[0];

export const list = ({ estado, abiertos, por_cobrar, sin_pagar, mesa_id, desde, hasta, limit }) => {
  const { sql, params } = buildWhere([
    estado && ['p.estado = ?', estado],
    abiertos && ["p.estado IN ('pendiente', 'en_preparacion')"],
    por_cobrar && ["p.estado = 'entregado' AND p.pagado_en IS NULL"],
    sin_pagar && ["p.estado <> 'cancelado' AND p.pagado_en IS NULL"],
    mesa_id && ['p.mesa_id = ?', mesa_id],
    desde && ['DATE(p.creado_en) >= ?', desde],
    hasta && ['DATE(p.creado_en) <= ?', hasta],
  ]);
  return query(`${SELECT} ${sql} ORDER BY p.id DESC LIMIT ${Number(limit)}`, params);   // limit ya validado por Zod
};

export const getItems = (pedidoId) => query(
  `SELECT i.id, i.producto_id, pr.nombre AS producto, pr.categoria, i.cantidad, i.precio_unitario,
          (i.cantidad * i.precio_unitario) AS subtotal, i.comensal
   FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id WHERE i.pedido_id = ? ORDER BY i.id`, [pedidoId]);

export const cuentaConsumo = (pedidoId) => query(
  'SELECT comensal, propio, compartido, total_a_pagar FROM v_cuenta_consumo WHERE pedido_id = ? ORDER BY comensal', [pedidoId]);

// ---------- TRANSACCIONALES (reciben run de withTransaction) ----------
export const productosPorIds = (ids, run) =>
  run(`SELECT id, nombre, precio, activo FROM productos WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
export const recetasPorProductos = (ids, run) =>
  run(`SELECT producto_id, insumo_id, cantidad FROM recetas WHERE producto_id IN (${ids.map(() => '?').join(',')})`, ids);

export const lockById = async (id, run) => (await run('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [id]))[0];
// Orden de bloqueo en toda la app: mesa -> pedido -> insumos
export const lockMesa = async (id, run) => (await run('SELECT * FROM mesas WHERE id = ? FOR UPDATE', [id]))[0];
export const mesaById = async (id, run = query) => (await run('SELECT * FROM mesas WHERE id = ?', [id]))[0];
export const create = async ({ mesa_id, usuario_id, num_comensales, total, notas }, run) =>
  (await run('INSERT INTO pedidos (mesa_id, usuario_id, num_comensales, total, notas) VALUES (?, ?, ?, ?, ?)',
    [mesa_id, usuario_id, num_comensales, total, notas ?? null])).insertId;
export const update = (id, fields, run) => updateById('pedidos', id, fields, run);
export const deleteItems = (pedidoId, run) => run('DELETE FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
export const addItems = async (pedidoId, lineas, run) => {
  for (const l of lineas)
    await run('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, comensal) VALUES (?, ?, ?, ?, ?)',
      [pedidoId, l.producto_id, l.cantidad, l.precio_unitario, l.comensal]);
};
export const ocuparMesa = (mesaId, run) => run("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [mesaId]);
export const marcarPagado = (id, { metodo_pago, usuario_id }, run) =>
  run('UPDATE pedidos SET pagado_en = NOW(), metodo_pago = ?, pagado_por = ? WHERE id = ?', [metodo_pago, usuario_id, id]);
// Libre solo si no quedan pedidos sin pagar (los cancelados no cuentan)
export const liberarMesaSiCorresponde = (mesaId, run) => run(
  `UPDATE mesas SET estado = 'libre' WHERE id = ?
   AND NOT EXISTS (SELECT 1 FROM pedidos WHERE mesa_id = ? AND estado <> 'cancelado' AND pagado_en IS NULL)`, [mesaId, mesaId]);
