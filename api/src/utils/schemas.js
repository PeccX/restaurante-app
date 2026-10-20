import { z } from 'zod';

export const idParams = z.object({ id: z.coerce.number().int().positive() });
export const bool = z.enum(['true', 'false']).transform((v) => v === 'true');   // query strings
export const atLeastOne = [(o) => Object.keys(o).length > 0, 'Envía al menos un campo para actualizar'];
// Al menos una letra: rechaza '000' o '--'
export const nombreTexto = z.string().trim().min(2).max(100).regex(/\p{L}/u, 'Debe contener al menos una letra');
// Rechaza fechas que no existen (2026-02-31): Date.parse las acepta
export const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().startsWith(d), 'Fecha inválida');
export const round3 = (v) => Math.round(v * 1000) / 1000;
