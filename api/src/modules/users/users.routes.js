import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './users.controller.js';
import { idParams, listQuery, createBody, updateBody } from './users.schema.js';

const router = Router();
router.use(authenticate, requireRole('admin'));        // todo el CRUD es solo para administradores

router.get('/', validate({ query: listQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.get);
router.post('/', validate({ body: createBody }), ctrl.create);
router.put('/:id', validate({ params: idParams, body: updateBody }), ctrl.update);
router.delete('/:id', validate({ params: idParams }), ctrl.remove);

export default router;
