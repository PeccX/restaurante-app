import { withTransaction } from '../../config/db.js';
import { AppError, orNotFound } from '../../utils/AppError.js';
import * as repo from './productos.repository.js';

export const list = (filters) => repo.list(filters);

export const get = async (id) => {
  const producto = orNotFound(await repo.findById(id), 'Producto');
  return { ...producto, receta: await repo.getReceta(id) };
};

const assertNombreFree = async (nombre, exceptId) => {
  const found = await repo.findByNombre(nombre);
  if (found && found.id !== exceptId) throw new AppError(409, `Ya existe un producto llamado "${nombre}"`, [{ campo: 'nombre', mensaje: 'Ya hay un producto con este nombre' }]);
};

const assertRecetaValida = async (receta) => {
  const ids = receta.map((i) => i.insumo_id);
  const validos = new Set((await repo.insumosActivos(ids)).map((i) => i.id));
  const malos = ids.filter((id) => !validos.has(id));
  if (malos.length) throw new AppError(400, 'Receta inválida: insumo inexistente o inactivo', malos.map((id) => ({ campo: 'receta.insumo_id', mensaje: `Insumo ${id} no existe o está inactivo` })));
};

export const create = async ({ receta, ...data }) => {
  await assertNombreFree(data.nombre);
  await assertRecetaValida(receta);
  const id = await withTransaction(async (run) => {
    const id = await repo.create(data, run);
    await repo.replaceReceta(id, receta, run);
    return id;
  });
  return get(id);
};

export const update = async (id, { receta, activo, ...data }) => {
  await get(id);
  if (data.nombre) await assertNombreFree(data.nombre, id);
  if (receta) await assertRecetaValida(receta);
  await withTransaction(async (run) => {
    await repo.update(id, { ...data, ...(activo !== undefined && { activo: activo ? 1 : 0 }) }, run);
    if (receta) await repo.replaceReceta(id, receta, run);
  });
  return get(id);
};

export const remove = async (id) => {
  await get(id);
  await withTransaction((run) => repo.update(id, { activo: 0 }, run));
};

// Borrado definitivo solo si nunca se vendió; si alguien vende justo en medio, la FK de pedido_items lo frena igual
export const eliminar = async (id) => {
  const producto = await get(id);
  if (producto.con_ventas) throw new AppError(409, 'Tiene ventas registradas; solo se puede desactivar');
  await withTransaction((run) => repo.borrar(id, run));
};
