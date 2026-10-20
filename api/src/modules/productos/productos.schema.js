import { z } from 'zod';
import { bool, atLeastOne, round3 } from '../../utils/schemas.js';

const nombre = z.string().trim().min(2).max(100);
const categoria = z.enum(['platillo', 'bebida', 'entrada', 'postre']);
const precio = z.number().min(0).max(99999.99).transform((v) => Math.round(v * 100) / 100);

const ingrediente = z.object({
  insumo_id: z.number().int().positive(),
  cantidad: z.number().positive().max(1_000_000).transform(round3),
}).strict();

// receta = lo que gasta UNA unidad vendida. [] = producto sin control de insumos.
const receta = z.array(ingrediente).max(30)
  .refine((r) => new Set(r.map((i) => i.insumo_id)).size === r.length, 'Hay insumos repetidos en la receta');

export const listQuery = z.object({
  activo: bool.optional(), categoria: categoria.optional(), q: z.string().trim().max(100).optional(),
});
export const createBody = z.object({ nombre, categoria: categoria.default('platillo'), precio, receta: receta.default([]) }).strict();
export const updateBody = z.object({
  nombre: nombre.optional(), categoria: categoria.optional(), precio: precio.optional(),
  activo: z.boolean().optional(), receta: receta.optional(),          // si viene, REEMPLAZA la receta completa
}).strict().refine(...atLeastOne);
