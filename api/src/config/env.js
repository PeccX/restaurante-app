import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1).default('restaurante'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  DB_TIMEZONE: z.string().regex(/^[+-]\d{2}:\d{2}$/, 'Formato +HH:MM').default('-06:00'),   // Guatemala
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),   // varios orígenes separados por coma
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10), // fallidos cada 15 min
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
