import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParams } from '../../utils/schemas.js';
import * as ctrl from './mesas.controller.js';
import { listQuery, createBody, updateBody } from './mesas.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.get);
router.post('/', requireRole('admin'), validate({ body: createBody }), ctrl.create);
router.put('/:id', requireRole('admin'), validate({ params: idParams, body: updateBody }), ctrl.update);
router.delete('/:id', requireRole('admin'), validate({ params: idParams }), ctrl.remove);

export default router;
