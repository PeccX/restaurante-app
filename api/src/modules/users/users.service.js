import bcrypt from 'bcryptjs';
import { AppError, orNotFound } from '../../utils/AppError.js';
import * as repo from './users.repository.js';

const hash = (password) => bcrypt.hash(password, 10);

export const list = (filters) => repo.list(filters);
export const get = async (id) => orNotFound(await repo.findById(id), 'Usuario');

const assertEmailFree = async (email, exceptId) => {
  const found = await repo.findByEmail(email);
  if (found && found.id !== exceptId) throw new AppError(409, 'El correo ya está registrado');
};

export const create = async ({ nombre, email, password, rol }) => {
  await assertEmailFree(email);
  return get(await repo.create({ nombre, email, password_hash: await hash(password), rol }));
};

export const update = async (id, data, actor) => {
  await get(id);
  if (id === actor.id && (data.activo === false || (data.rol && data.rol !== actor.rol)))
    throw new AppError(400, 'No puedes desactivarte ni cambiar tu propio rol');
  if (data.email) await assertEmailFree(data.email, id);
  const { password, activo, ...rest } = data;
  const fields = { ...rest };
  if (password) fields.password_hash = await hash(password);
  if (activo !== undefined) fields.activo = activo ? 1 : 0;
  await repo.update(id, fields);
  return get(id);
};

// Borrado lógico: los pedidos referencian al usuario
export const remove = async (id, actor) => {
  if (id === actor.id) throw new AppError(400, 'No puedes eliminar tu propio usuario');
  await get(id);
  await repo.update(id, { activo: 0 });
};
