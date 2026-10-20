import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './auth.controller.js';
import { loginBody } from './auth.schema.js';

// Frena fuerza bruta: solo cuenta los intentos FALLIDOS por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: env.LOGIN_MAX_ATTEMPTS, skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos' },
});

const router = Router();
router.post('/login', loginLimiter, validate({ body: loginBody }), ctrl.login);
router.get('/me', authenticate, ctrl.me);

export default router;
