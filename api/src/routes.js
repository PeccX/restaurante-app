import { Router } from 'express';
import { query } from './config/db.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import mesasRoutes from './modules/mesas/mesas.routes.js';
import insumosRoutes from './modules/insumos/insumos.routes.js';
import productosRoutes from './modules/productos/productos.routes.js';
import pedidosRoutes from './modules/pedidos/pedidos.routes.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try { await query('SELECT 1'); res.json({ status: 'ok', db: 'ok' }); }
  catch { res.status(503).json({ status: 'error', db: 'down' }); }
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/mesas', mesasRoutes);
router.use('/insumos', insumosRoutes);
router.use('/productos', productosRoutes);
router.use('/pedidos', pedidosRoutes);

export default router;
