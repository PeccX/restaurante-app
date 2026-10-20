import { z } from 'zod';

export const idParams = z.object({ id: z.coerce.number().int().positive() });
export const bool = z.enum(['true', 'false']).transform((v) => v === 'true');   // para query strings
export const atLeastOne = [(o) => Object.keys(o).length > 0, 'Envía al menos un campo para actualizar'];
export const round3 = (v) => Math.round(v * 1000) / 1000;
