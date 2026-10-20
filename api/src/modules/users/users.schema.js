import { z } from 'zod';
import { nombreTexto } from '../../utils/schemas.js';

const id = z.coerce.number().int().positive();
const nombre = nombreTexto;
const email = z.string().trim().toLowerCase().email().max(150);
const password = z.string()
  .min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres')   // límite de bcrypt
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');
const rol = z.enum(['admin', 'mesero', 'cocina']);

export const idParams = z.object({ id });

export const listQuery = z.object({
  activo: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  q: z.string().trim().max(100).optional(),
});

export const createBody = z.object({ nombre, email, password, rol: rol.default('mesero') }).strict();

export const updateBody = z.object({
  nombre: nombre.optional(), email: email.optional(), password: password.optional(),
  rol: rol.optional(), activo: z.boolean().optional(),
}).strict().refine((o) => Object.keys(o).length > 0, 'Envía al menos un campo para actualizar');
