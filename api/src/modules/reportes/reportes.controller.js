import * as service from './reportes.service.js';
import { cuentaPdf, ventasPdf } from './reportes.pdf.js';
import { ventasExcel } from './reportes.excel.js';

const adjunto = (res, tipo, nombre) => res.set({ 'Content-Type': tipo, 'Content-Disposition': `attachment; filename="${nombre}"` });
const PDF = 'application/pdf';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const nombreRango = ({ desde, hasta }) => `ventas_${desde}_${hasta}`;

export const ventas = async (req, res) => res.json(await service.ventas(req.valid.query));

export const ventasExcelCtrl = async (req, res) => {
  const buffer = await ventasExcel(await service.ventas(req.valid.query), req.user);
  adjunto(res, XLSX, `${nombreRango(req.valid.query)}.xlsx`).send(Buffer.from(buffer));
};

// Consultar antes de hacer pipe: si falla, todavía se responde con JSON
export const ventasPdfCtrl = async (req, res) => {
  const doc = ventasPdf(await service.ventas(req.valid.query), req.user);
  adjunto(res, PDF, `${nombreRango(req.valid.query)}.pdf`);
  doc.pipe(res); doc.end();
};

export const cuentaPdfCtrl = async (req, res) => {
  const doc = cuentaPdf(await service.cuenta(req.valid.params.id, req.valid.query), req.user);
  adjunto(res, PDF, `cuenta_pedido_${req.valid.params.id}.pdf`);
  doc.pipe(res); doc.end();
};
