import { z } from 'zod';
import { bool } from '../../utils/schemas.js';

const id = z.number().int().positive();
const numComensales = z.number().int().min(1).max(50);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Fecha inválida');

const item = z.object({
  producto_id: id,
  cantidad: z.number().int().min(1).max(99),
  comensal: z.number().int().min(1).max(50).nullable().default(null),   // null = compartido
}).strict();                                                            // strict: el precio no se acepta del cliente

const items = z.array(item).min(1, 'El pedido debe tener al menos un producto').max(50);
const notas = z.string().trim().max(255);

const comensalesValidos = [
  (o) => o.items.every((i) => i.comensal === null || i.comensal <= o.num_comensales),
  { message: 'Hay ítems asignados a un comensal que no existe en el pedido', path: ['items'] },
];

export const createBody = z.object({ mesa_id: id, num_comensales: numComensales, items, notas: notas.optional() })
  .strict().refine(...comensalesValidos);
// Reemplaza todos los ítems
export const updateBody = z.object({ num_comensales: numComensales, items, notas: notas.optional() })
  .strict().refine(...comensalesValidos);

export const estadoBody = z.object({
  estado: z.enum(['en_preparacion', 'entregado', 'cancelado']),
  motivo: z.string().trim().max(200).optional(),
}).strict();

export const pagoBody = z.object({ metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia']) }).strict();

export const listQuery = z.object({
  estado: z.enum(['pendiente', 'en_preparacion', 'entregado', 'cancelado']).optional(),
  abiertos: bool.optional(),                                // pendiente + en_preparacion (cocina)
  por_cobrar: bool.optional(),                              // entregados sin pagar
  mesa_id: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(), hasta: fecha.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
}).refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] });

export const cuentaQuery = z.object({ modo: z.enum(['consumo', 'iguales']).default('consumo') });
