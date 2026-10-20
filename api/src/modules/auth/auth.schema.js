import { z } from 'zod';

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'La contraseña es obligatoria').max(72),
}).strict();
