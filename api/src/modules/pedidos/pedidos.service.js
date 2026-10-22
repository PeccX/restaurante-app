import { withTransaction } from '../../config/db.js';
import { AppError, orNotFound } from '../../utils/AppError.js';
import * as repo from './pedidos.repository.js';
import { aplicarConsumo, devolverConsumo } from './pedidos.inventario.js';
import { dividirIguales } from './pedidos.cuenta.js';

// pendiente -> en_preparacion -> entregado -> pagado. Cancelar solo antes de entregar.
const TRANSICIONES = { pendiente: ['en_preparacion', 'cancelado'], en_preparacion: ['entregado', 'cancelado'], entregado: [], cancelado: [] };

// con_items: una sola consulta para los ítems de todos los pedidos (pantalla de cocina)
export const list = async ({ con_items, ...filtros }) => {
  const pedidos = await repo.list(filtros);
  if (!con_items) return pedidos;
  const items = await repo.getItemsDe(pedidos.map((p) => p.id));
  return pedidos.map((p) => ({ ...p, items: items.filter((i) => i.pedido_id === p.id) }));
};

export const get = async (id) => {
  const pedido = orNotFound(await repo.findById(id), 'Pedido');
  return { ...pedido, items: await repo.getItems(id) };
};

const assertCapacidad = (mesa, numComensales) => {
  if (numComensales > mesa.capacidad)
    throw new AppError(400, 'Datos inválidos', [{ campo: 'num_comensales', mensaje: `La mesa ${mesa.numero} tiene capacidad para ${mesa.capacidad}` }]);
};

// Precios desde la BD, total en centavos
const prepararLineas = async (items, run) => {
  const ids = [...new Set(items.map((i) => i.producto_id))];
  const porId = new Map((await repo.productosPorIds(ids, run)).map((p) => [p.id, p]));
  const malos = ids.filter((id) => !porId.get(id)?.activo);
  if (malos.length)
    throw new AppError(400, 'Datos inválidos', malos.map((id) => ({ campo: 'items.producto_id', mensaje: `El producto ${id} no existe o está inactivo` })));
  const lineas = items.map((i) => ({ ...i, precio_unitario: porId.get(i.producto_id).precio }));
  const total = lineas.reduce((s, l) => s + Math.round(l.precio_unitario * 100) * l.cantidad, 0) / 100;
  return { lineas, total };
};

export const create = async ({ mesa_id, num_comensales, items, notas }, actor) => {
  const id = await withTransaction(async (run) => {
    const mesa = await repo.lockMesa(mesa_id, run);                       // mesa primero (orden de bloqueo)
    if (!mesa || !mesa.activo) throw new AppError(400, 'Datos inválidos', [{ campo: 'mesa_id', mensaje: 'La mesa no existe o está inactiva' }]);
    assertCapacidad(mesa, num_comensales);
    const { lineas, total } = await prepararLineas(items, run);
    const id = await repo.create({ mesa_id, usuario_id: actor.id, num_comensales, total, notas }, run);
    await repo.addItems(id, lineas, run);
    await aplicarConsumo(id, lineas, actor, run, 'Pedido nuevo');
    await repo.ocuparMesa(mesa_id, run);
    return id;
  });
  return get(id);
};

// Devuelve el consumo anterior y aplica el nuevo
export const update = async (id, { num_comensales, items, notas }, actor) => {
  await withTransaction(async (run) => {
    const pedido = orNotFound(await repo.lockById(id, run), 'Pedido');
    if (pedido.estado !== 'pendiente') throw new AppError(409, 'Solo se puede editar un pedido pendiente');
    assertCapacidad(await repo.mesaById(pedido.mesa_id, run), num_comensales);

    const { lineas, total } = await prepararLineas(items, run);
    await devolverConsumo(id, actor, run, 'Pedido editado (devolución)');
    await repo.deleteItems(id, run);
    await repo.addItems(id, lineas, run);
    await aplicarConsumo(id, lineas, actor, run, 'Pedido editado');
    await repo.update(id, { num_comensales, total, ...(notas !== undefined && { notas }) }, run);
  });
  return get(id);
};

export const cambiarEstado = async (id, { estado, motivo }, actor) => {
  if (estado === 'cancelado' && actor.rol === 'cocina') throw new AppError(403, 'No tienes permiso para cancelar pedidos');
  await withTransaction(async (run) => {
    const previo = orNotFound(await repo.findById(id), 'Pedido');
    await repo.lockMesa(previo.mesa_id, run);
    const pedido = orNotFound(await repo.lockById(id, run), 'Pedido');   // evita devolver stock dos veces
    if (!TRANSICIONES[pedido.estado].includes(estado))
      throw new AppError(409, `No se puede pasar de "${pedido.estado}" a "${estado}"`);
    if (estado === 'cancelado') await devolverConsumo(id, actor, run, motivo ? `Pedido cancelado: ${motivo}` : 'Pedido cancelado');
    await repo.update(id, { estado }, run);
    if (estado === 'cancelado') await repo.liberarMesaSiCorresponde(pedido.mesa_id, run);
  });
  return get(id);
};

// La mesa se libera aquí, no al entregar
export const pagar = async (id, { metodo_pago }, actor) => {
  await withTransaction(async (run) => {
    const previo = orNotFound(await repo.findById(id), 'Pedido');
    await repo.lockMesa(previo.mesa_id, run);
    const pedido = orNotFound(await repo.lockById(id, run), 'Pedido');
    if (pedido.pagado_en) throw new AppError(409, 'Este pedido ya fue pagado');
    if (pedido.estado !== 'entregado') throw new AppError(409, `Solo se puede cobrar un pedido entregado (estado actual: "${pedido.estado}")`);
    await repo.marcarPagado(id, { metodo_pago, usuario_id: actor.id }, run);
    await repo.liberarMesaSiCorresponde(pedido.mesa_id, run);
  });
  return get(id);
};

export const cuenta = async (id, { modo }) => {
  const pedido = await get(id);
  if (pedido.estado === 'cancelado') throw new AppError(409, 'El pedido está cancelado');
  const base = { pedido_id: id, mesa: pedido.mesa, estado: pedido.estado, modo, num_comensales: pedido.num_comensales, total: pedido.total };

  if (modo === 'iguales')
    return { ...base, cuentas: dividirIguales(pedido.total, pedido.num_comensales).map((t, i) => ({ comensal: i + 1, total_a_pagar: t })) };

  const filas = await repo.cuentaConsumo(id);
  return {
    ...base,
    cuentas: filas.map((f) => ({ ...f, items: pedido.items.filter((i) => i.comensal === f.comensal) })),
    items_compartidos: pedido.items.filter((i) => i.comensal === null),
  };
};
