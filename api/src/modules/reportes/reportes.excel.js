import ExcelJS from 'exceljs';
import { horaLocal, fmtDia, fmtFechaHora, capitalizar } from '../../utils/formato.js';

const ACENTO = 'FFEA6A12';
const Q = '"Q" #,##0.00';
const dia = (iso) => new Date(`${iso}T00:00:00Z`);

// total: keys que llevan SUM al final
const hoja = (wb, nombre, columnas, filas, { total = [], vacio = 'Sin datos en este rango' } = {}) => {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columnas.map((c) => ({ header: c.titulo, key: c.key, width: c.ancho ?? 14, style: c.fmt ? { numFmt: c.fmt } : {} }));
  const cab = ws.getRow(1);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACENTO } };
  cab.alignment = { vertical: 'middle' };
  cab.height = 20;
  filas.forEach((f) => ws.addRow(f));
  if (!filas.length) ws.addRow({ [columnas[0].key]: vacio }).font = { italic: true, color: { argb: 'FF57534E' } };
  if (filas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: filas.length + 1, column: columnas.length } };
  if (total.length && filas.length) {
    const n = filas.length + 1;
    const r = ws.addRow({ [columnas[0].key]: 'Total' });
    total.forEach((key) => {
      const col = ws.getColumn(key).letter;
      // result: por si el programa no recalcula al abrir
      r.getCell(key).value = { formula: `SUM(${col}2:${col}${n})`, result: filas.reduce((s, f) => s + Number(f[key] ?? 0), 0) };
    });
    r.font = { bold: true };
    r.border = { top: { style: 'thin' } };
  }
  return ws;
};

export const ventasExcel = async (d, usuario) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sabor Chapín'; wb.created = new Date();

  const res = wb.addWorksheet('Resumen');
  res.columns = [{ width: 26 }, { width: 18 }, { width: 14 }];
  res.addRow(['Sabor Chapín, reporte de ventas']).font = { bold: true, size: 14, color: { argb: ACENTO } };
  res.addRow([`Del ${fmtDia(d.desde)} al ${fmtDia(d.hasta)}`]);
  res.addRow([`Generado el ${fmtFechaHora(Date.now())} por ${usuario.nombre}`]).font = { italic: true, color: { argb: 'FF57534E' } };
  res.addRow(['Solo cuenta pedidos entregados y pagados, en la fecha del pago.']).font = { italic: true, color: { argb: 'FF57534E' } };
  res.addRow([]);
  [['Total vendido', d.resumen.total_ventas, Q], ['Pedidos', d.resumen.num_pedidos], ['Comensales', d.resumen.comensales],
    ['Ticket promedio', d.resumen.ticket_promedio, Q]].forEach(([k, v, fmt]) => {
    const r = res.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    if (fmt) r.getCell(2).numFmt = fmt;
  });
  res.addRow([]);
  const cab = res.addRow(['Método de pago', 'Total', 'Pedidos']);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACENTO } }; });
  d.metodos_pago.forEach((m) => { res.addRow([capitalizar(m.metodo_pago), m.total, m.num_pedidos]).getCell(2).numFmt = Q; });
  if (!d.metodos_pago.length) res.addRow(['Sin pagos en este rango']);

  hoja(wb, 'Ventas por día', [
    { titulo: 'Fecha', key: 'fecha', fmt: 'dd/mm/yyyy', ancho: 14 }, { titulo: 'Pedidos', key: 'num_pedidos' },
    { titulo: 'Comensales', key: 'comensales' }, { titulo: 'Total', key: 'total_ventas', fmt: Q, ancho: 16 },
  ], d.ventas_por_dia.map((v) => ({ ...v, fecha: dia(v.fecha) })), { total: ['num_pedidos', 'comensales', 'total_ventas'] });

  hoja(wb, 'Productos', [
    { titulo: 'Producto', key: 'producto', ancho: 30 }, { titulo: 'Categoría', key: 'categoria' },
    { titulo: 'Unidades', key: 'unidades' }, { titulo: 'Ingresos', key: 'ingresos', fmt: Q, ancho: 16 },
  ], d.productos.map((p) => ({ ...p, categoria: capitalizar(p.categoria) })), { total: ['unidades', 'ingresos'] });

  hoja(wb, 'Pedidos', [
    { titulo: 'Pedido', key: 'id', ancho: 10 }, { titulo: 'Fecha de pago', key: 'pagado_en', fmt: 'dd/mm/yyyy hh:mm', ancho: 18 },
    { titulo: 'Mesa', key: 'mesa', ancho: 8 }, { titulo: 'Mesero', key: 'mesero', ancho: 22 },
    { titulo: 'Comensales', key: 'num_comensales' }, { titulo: 'Método', key: 'metodo_pago' },
    { titulo: 'Total', key: 'total', fmt: Q, ancho: 16 },
  ], d.pedidos.map((p) => ({ ...p, pagado_en: horaLocal(p.pagado_en), metodo_pago: capitalizar(p.metodo_pago) })), { total: ['num_comensales', 'total'] });

  hoja(wb, 'Insumos bajo mínimo', [
    { titulo: 'Insumo', key: 'nombre', ancho: 26 }, { titulo: 'Unidad', key: 'unidad', ancho: 10 },
    { titulo: 'Stock', key: 'stock', fmt: '#,##0.###' }, { titulo: 'Mínimo', key: 'stock_minimo', fmt: '#,##0.###' },
    { titulo: 'Faltante', key: 'faltante', fmt: '#,##0.###' },
  ], d.insumos_bajo_minimo, { vacio: 'Ningún insumo está bajo el mínimo' });

  return wb.xlsx.writeBuffer();
};
