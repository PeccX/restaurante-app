import { z } from 'zod';
import { bool, atLeastOne } from '../../utils/schemas.js';

const numero = z.number().int().min(1).max(999);
const capacidad = z.number().int().min(1).max(50);
const estado = z.enum(['libre', 'ocupada']);

export const listQuery = z.object({ activo: bool.optional(), estado: estado.optional() });
export const createBody = z.object({ numero, capacidad: capacidad.default(4) }).strict();
export const updateBody = z.object({
  numero: numero.optional(), capacidad: capacidad.optional(), estado: estado.optional(), activo: z.boolean().optional(),
}).strict().refine(...atLeastOne);
