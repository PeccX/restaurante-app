import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParams } from '../../utils/schemas.js';
import * as ctrl from './insumos.controller.js';
import { listQuery, createBody, updateBody, ajusteBody, movimientosQuery } from './insumos.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.get);
router.get('/:id/movimientos', requireRole('admin', 'cocina'), validate({ params: idParams, query: movimientosQuery }), ctrl.movimientos);
router.post('/', requireRole('admin'), validate({ body: createBody }), ctrl.create);
router.put('/:id', requireRole('admin'), validate({ params: idParams, body: updateBody }), ctrl.update);
router.post('/:id/ajuste', requireRole('admin', 'cocina'), validate({ params: idParams, body: ajusteBody }), ctrl.ajustar);
router.delete('/:id', requireRole('admin'), validate({ params: idParams }), ctrl.remove);

export default router;
