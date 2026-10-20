import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParams } from '../../utils/schemas.js';
import * as ctrl from './pedidos.controller.js';
import { createBody, updateBody, estadoBody, listQuery, cuentaQuery, pagoBody } from './pedidos.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.get);
router.get('/:id/cuenta', validate({ params: idParams, query: cuentaQuery }), ctrl.cuenta);
router.post('/', requireRole('admin', 'mesero'), validate({ body: createBody }), ctrl.create);
router.put('/:id', requireRole('admin', 'mesero'), validate({ params: idParams, body: updateBody }), ctrl.update);
router.patch('/:id/estado', validate({ params: idParams, body: estadoBody }), ctrl.cambiarEstado);   // cocina no cancela (se valida en el service)
router.post('/:id/pago', requireRole('admin', 'mesero'), validate({ params: idParams, body: pagoBody }), ctrl.pagar);

export default router;
