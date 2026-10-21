import { AppError, orNotFound } from '../../utils/AppError.js';
import * as repo from './mesas.repository.js';

export const list = (filters) => repo.list(filters);
export const get = async (id) => orNotFound(await repo.findById(id), 'Mesa');

const assertNumeroFree = async (numero, exceptId) => {
  const found = await repo.findByNumero(numero);
  if (found && found.id !== exceptId) throw new AppError(409, `Ya existe la mesa ${numero}`, [{ campo: 'numero', mensaje: 'Ese número ya está en uso' }]);
};

export const create = async (data) => {
  await assertNumeroFree(data.numero);
  return get(await repo.create(data));
};

export const update = async (id, data) => {
  const mesa = await get(id);
  if (data.numero !== undefined) await assertNumeroFree(data.numero, id);
  if (data.activo === false && mesa.estado === 'ocupada') throw new AppError(409, 'La mesa está ocupada');
  if (data.estado === 'libre') {
    const n = await repo.cuentasPendientes(id);
    if (n) throw new AppError(409, `La mesa tiene ${n} cuenta(s) sin pagar; se libera al cobrar o cancelar`);
  }
  const { activo, ...rest } = data;
  await repo.update(id, { ...rest, ...(activo !== undefined && { activo: activo ? 1 : 0 }) });
  return get(id);
};

export const remove = async (id) => {
  const mesa = await get(id);
  if (mesa.estado === 'ocupada') throw new AppError(409, 'La mesa está ocupada');
  await repo.update(id, { activo: 0 });
};
