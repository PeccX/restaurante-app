// Se llama dentro de withTransaction (recibe run)
import { AppError } from '../../utils/AppError.js';
import { round3 } from '../../utils/schemas.js';
import * as insumos from '../insumos/insumos.repository.js';
import * as repo from './pedidos.repository.js';

// Si un insumo no alcanza, falla todo y dice cuáles
export const aplicarConsumo = async (pedidoId, lineas, actor, run, motivo) => {
  const recetas = await repo.recetasPorProductos([...new Set(lineas.map((l) => l.producto_id))], run);
  const necesario = new Map();                                   // insumo_id -> cantidad
  for (const l of lineas)
    for (const r of recetas.filter((r) => r.producto_id === l.producto_id))
      necesario.set(r.insumo_id, round3((necesario.get(r.insumo_id) ?? 0) + r.cantidad * l.cantidad));
  if (!necesario.size) return;                                   // productos sin receta

  const filas = await insumos.lockByIds([...necesario.keys()], run);
  const faltantes = filas.filter((i) => i.stock < necesario.get(i.id));
  if (faltantes.length)
    throw new AppError(409, 'No hay suficientes insumos para preparar el pedido', faltantes.map((i) => ({
      campo: 'insumo', mensaje: `${i.nombre}: se necesitan ${necesario.get(i.id)} ${i.unidad} y hay ${i.stock}`,
    })));

  for (const i of filas) {
    const nuevo = round3(i.stock - necesario.get(i.id));
    await insumos.setStock(i.id, nuevo, run);
    await insumos.addMovimiento({ insumo_id: i.id, tipo: 'consumo', cantidad: -necesario.get(i.id), stock_resultante: nuevo, pedido_id: pedidoId, usuario_id: actor.id, motivo }, run);
  }
};

// Devuelve el consumo neto según el historial: nunca devuelve dos veces
export const devolverConsumo = async (pedidoId, actor, run, motivo) => {
  const neto = await run(
    `SELECT insumo_id, -SUM(cantidad) AS devolver FROM movimientos_inventario
     WHERE pedido_id = ? AND tipo IN ('consumo', 'devolucion') GROUP BY insumo_id HAVING devolver > 0`, [pedidoId]);
  if (!neto.length) return;
  const devolver = new Map(neto.map((n) => [n.insumo_id, n.devolver]));
  const filas = await insumos.lockByIds([...devolver.keys()], run);
  for (const i of filas) {
    const nuevo = round3(i.stock + devolver.get(i.id));
    await insumos.setStock(i.id, nuevo, run);
    await insumos.addMovimiento({ insumo_id: i.id, tipo: 'devolucion', cantidad: devolver.get(i.id), stock_resultante: nuevo, pedido_id: pedidoId, usuario_id: actor.id, motivo }, run);
  }
};
