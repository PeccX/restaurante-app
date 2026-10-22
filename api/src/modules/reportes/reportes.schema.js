import { z } from 'zod';
import { fecha } from '../../utils/schemas.js';

const DIA = 86_400_000;
export const MAX_DIAS = 366;
const dias = (desde, hasta) => (Date.parse(hasta) - Date.parse(desde)) / DIA + 1;

// Sin fechas: últimos 30 días
export const rangoQuery = (hoy) => z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
}).strict()
  .transform(({ desde, hasta = hoy() }) => ({ hasta, desde: desde ?? new Date(Date.parse(hasta) - 29 * DIA).toISOString().slice(0, 10) }))
  .refine((r) => r.desde <= r.hasta, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] })
  .refine((r) => dias(r.desde, r.hasta) <= MAX_DIAS, { message: `El rango no puede pasar de ${MAX_DIAS} días`, path: ['hasta'] });

export const cuentaQuery = z.object({ tipo: z.enum(['unica', 'iguales', 'consumo']).default('unica') }).strict();

export const listaDeDias = (desde, hasta) =>
  Array.from({ length: dias(desde, hasta) }, (_, i) => new Date(Date.parse(desde) + i * DIA).toISOString().slice(0, 10));
