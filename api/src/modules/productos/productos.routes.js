import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParams } from '../../utils/schemas.js';
import * as ctrl from './productos.controller.js';
import { listQuery, createBody, updateBody } from './productos.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.get);
router.post('/', requireRole('admin'), validate({ body: createBody }), ctrl.create);
router.put('/:id', requireRole('admin'), validate({ params: idParams, body: updateBody }), ctrl.update);
router.delete('/:id', requireRole('admin'), validate({ params: idParams }), ctrl.remove);
router.delete('/:id/definitivo', requireRole('admin'), validate({ params: idParams }), ctrl.eliminar);

export default router;
