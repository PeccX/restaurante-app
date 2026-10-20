import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParams } from '../../utils/schemas.js';
import { hoy } from '../../utils/formato.js';
import * as ctrl from './reportes.controller.js';
import { rangoQuery, cuentaQuery } from './reportes.schema.js';

const router = Router();
router.use(authenticate);
const rango = validate({ query: rangoQuery(hoy) });

router.get('/ventas', requireRole('admin'), rango, ctrl.ventas);
router.get('/ventas/excel', requireRole('admin'), rango, ctrl.ventasExcelCtrl);
router.get('/ventas/pdf', requireRole('admin'), rango, ctrl.ventasPdfCtrl);
router.get('/cuenta/:id/pdf', requireRole('admin', 'mesero'), validate({ params: idParams, query: cuentaQuery }), ctrl.cuentaPdfCtrl);

export default router;
