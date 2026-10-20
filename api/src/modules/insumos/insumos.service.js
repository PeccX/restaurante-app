import { withTransaction } from '../../config/db.js';
import { AppError, orNotFound } from '../../utils/AppError.js';
import { round3 } from '../../utils/schemas.js';
import * as repo from './insumos.repository.js';

export const list = (filters) => repo.list(filters);
export const get = async (id) => orNotFound(await repo.findById(id), 'Insumo');

export const create = async (data, actor) => {
  const id = await withTransaction(async (run) => {
    const id = await repo.create(data, run);
    if (data.stock > 0)
      await repo.addMovimiento({ insumo_id: id, tipo: 'ajuste', cantidad: data.stock, stock_resultante: data.stock, usuario_id: actor.id, motivo: 'Stock inicial' }, run);
    return id;
  });
  return get(id);
};

export const update = async (id, data) => {
  const insumo = await get(id);
  if (data.unidad && data.unidad !== insumo.unidad && (await repo.usadoEnRecetas(id)))
    throw new AppError(409, 'No se puede cambiar la unidad: el insumo ya está en recetas');
  if (data.activo === false) await assertNoEnUso(id);
  const { activo, ...rest } = data;
  await repo.update(id, { ...rest, ...(activo !== undefined && { activo: activo ? 1 : 0 }) });
  return get(id);
};

const assertNoEnUso = async (id) => {
  const usos = await repo.productosQueLoUsan(id);
  if (usos.length) throw new AppError(409, `No se puede desactivar: lo usan las recetas de ${usos.map((u) => u.nombre).join(', ')}`);
};

// "Eliminar" = desactivar, solo si ningún producto activo lo usa
export const remove = async (id) => {
  await get(id);
  await assertNoEnUso(id);
  await repo.update(id, { activo: 0 });
};

// Ajuste de existencias: todo o nada, con la fila bloqueada para que dos ajustes simultáneos no se pisen
export const ajustar = async (id, { cantidad, motivo }, actor) => {
  await withTransaction(async (run) => {
    const insumo = orNotFound(await repo.lockById(id, run), 'Insumo');
    const nuevo = round3(insumo.stock + cantidad);
    if (nuevo < 0) throw new AppError(409, `Stock insuficiente de ${insumo.nombre}: hay ${insumo.stock} ${insumo.unidad}`);
    await repo.setStock(id, nuevo, run);
    await repo.addMovimiento({ insumo_id: id, tipo: 'ajuste', cantidad, stock_resultante: nuevo, usuario_id: actor.id, motivo }, run);
  });
  return get(id);
};

export const movimientos = async (id, { limit }) => {
  await get(id);
  return repo.movimientos(id, limit);
};
