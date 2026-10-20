import { z } from 'zod';
import { bool, atLeastOne, round3, nombreTexto } from '../../utils/schemas.js';

const nombre = nombreTexto;
const unidad = z.enum(['g', 'ml', 'unidad']);
const cantidad = z.number().min(0).max(10_000_000).transform(round3);

export const listQuery = z.object({
  activo: bool.optional(), bajo_minimo: bool.optional(), q: z.string().trim().max(100).optional(),
});
export const createBody = z.object({
  nombre, unidad, stock: cantidad.default(0), stock_minimo: cantidad.default(0),
}).strict();
// El stock solo cambia con ajustes, para que quede en el historial
export const updateBody = z.object({
  nombre: nombre.optional(), unidad: unidad.optional(), stock_minimo: cantidad.optional(), activo: z.boolean().optional(),
}).strict().refine(...atLeastOne);
export const ajusteBody = z.object({
  cantidad: z.number().min(-10_000_000).max(10_000_000).transform(round3)
    .refine((v) => v !== 0, 'La cantidad no puede ser 0'),                // + entra, - sale
  motivo: z.string().trim().min(3).max(200),
}).strict();
export const movimientosQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });
