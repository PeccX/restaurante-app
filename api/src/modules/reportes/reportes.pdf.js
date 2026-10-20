import PDFDocument from 'pdfkit';
import { fmtDia, fmtFechaHora, quetzales, capitalizar } from '../../utils/formato.js';

const C = { acento: '#9a3412', texto: '#1c1917', suave: '#57534e', linea: '#d6d3d1', zebra: '#f5f5f4' };
const M = 50;                                     // margen

const nuevoDoc = (titulo) => new PDFDocument({ size: 'LETTER', margin: M, bufferPages: true, info: { Title: titulo, Author: 'Sabor Chapín' } });
const ancho = (doc) => doc.page.width - 2 * M;

const encabezado = (doc, titulo, subtitulo) => {
  doc.rect(0, 0, doc.page.width, 6).fill(C.acento);
  doc.fillColor(C.acento).font('Helvetica-Bold').fontSize(20).text('Sabor Chapín', M, M);
  doc.fillColor(C.suave).font('Helvetica').fontSize(9).text('Restaurante · Quetzaltenango, Guatemala');
  doc.moveDown(1.2).fillColor(C.texto).font('Helvetica-Bold').fontSize(15).text(titulo);
  if (subtitulo) doc.fillColor(C.suave).font('Helvetica').fontSize(10).text(subtitulo);
  doc.moveDown(0.8);
};

const subtitulo = (doc, texto) => {
  espacio(doc, 60);
  doc.moveDown(0.6).fillColor(C.texto).font('Helvetica-Bold').fontSize(12).text(texto, M);
  doc.moveDown(0.3);
};

const espacio = (doc, alto) => { if (doc.y + alto > doc.page.height - M - 20) doc.addPage(); };

// columnas: [{ titulo, ancho (proporción), align }]; filas: arreglos de textos ya formateados
const tabla = (doc, columnas, filas, { total } = {}) => {
  const W = ancho(doc), suma = columnas.reduce((s, c) => s + c.ancho, 0);
  const cols = columnas.map((c) => ({ ...c, w: (c.ancho / suma) * W }));
  const ALTO = 18;
  const fila = (valores, { fondo, negrita, color = C.texto } = {}) => {
    espacio(doc, ALTO);
    const y = doc.y;
    if (fondo) doc.rect(M, y, W, ALTO).fill(fondo);
    let x = M;
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(color);
    cols.forEach((c, i) => {
      doc.text(String(valores[i] ?? ''), x + 4, y + 5, { width: c.w - 8, height: 11, align: c.align ?? 'left', ellipsis: true });
      x += c.w;
    });
    doc.x = M; doc.y = y + ALTO;
  };
  const cabecera = () => fila(cols.map((c) => c.titulo), { fondo: C.acento, negrita: true, color: '#ffffff' });
  cabecera();
  filas.forEach((f, i) => {
    if (doc.y + ALTO > doc.page.height - M - 20) { doc.addPage(); cabecera(); }
    fila(f, { fondo: i % 2 ? C.zebra : null });
  });
  if (total) {
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(0.8).strokeColor(C.texto).stroke();
    fila(total, { negrita: true });
  }
  doc.moveDown(0.4);
};

// Bloque de datos en dos columnas: [[etiqueta, valor], ...]
const datos = (doc, pares) => {
  const W = ancho(doc) / 2, y0 = doc.y;
  pares.forEach(([k, v], i) => {
    const x = M + (i % 2) * W, y = y0 + Math.floor(i / 2) * 16;
    doc.font('Helvetica').fontSize(9).fillColor(C.suave).text(k, x, y, { width: 90, lineBreak: false });
    doc.font('Helvetica-Bold').fillColor(C.texto).text(v, x + 90, y, { width: W - 95, height: 11, ellipsis: true });
  });
  doc.x = M; doc.y = y0 + Math.ceil(pares.length / 2) * 16 + 6;
};

const tarjetas = (doc, items) => {
  const gap = 10, w = (ancho(doc) - gap * (items.length - 1)) / items.length, y = doc.y, h = 50;
  items.forEach(([k, v], i) => {
    const x = M + i * (w + gap);
    doc.roundedRect(x, y, w, h, 4).lineWidth(0.8).strokeColor(C.linea).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(C.suave).text(k.toUpperCase(), x + 10, y + 10, { width: w - 20 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.texto).text(v, x + 10, y + 24, { width: w - 20 });
  });
  doc.x = M; doc.y = y + h + 8;
};

const pie = (doc, texto) => {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - M + 10;
    doc.page.margins.bottom = 0;                  // escribir en el margen sin crear otra página
    doc.font('Helvetica').fontSize(8).fillColor(C.suave)
      .text(texto, M, y, { width: ancho(doc) / 2, lineBreak: false })
      .text(`Página ${i + 1} de ${rango.count}`, M + ancho(doc) / 2, y, { width: ancho(doc) / 2, align: 'right', lineBreak: false });
  }
};

export const cuentaPdf = ({ pedido, cuenta }, usuario) => {
  const doc = nuevoDoc(`Cuenta pedido ${pedido.id}`);
  encabezado(doc, `Cuenta del pedido #${pedido.id}`, `Mesa ${pedido.mesa}`);
  datos(doc, [
    ['Mesero', pedido.mesero], ['Comensales', String(pedido.num_comensales)],
    ['Fecha', fmtFechaHora(pedido.creado_en)], ['Estado', capitalizar(pedido.estado)],
    ['Pago', pedido.pagado_en ? `${capitalizar(pedido.metodo_pago)} · ${fmtFechaHora(pedido.pagado_en)}` : 'Pendiente de pago'],
    ['División', cuenta.modo === 'iguales' ? 'Partes iguales' : 'Por consumo'],
  ]);
  if (pedido.notas) doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.suave).text(`Notas: ${pedido.notas}`, M).moveDown(0.4);

  subtitulo(doc, 'Consumo');
  const items = [...pedido.items].sort((a, b) => (a.comensal ?? 99) - (b.comensal ?? 99));
  tabla(doc, [{ titulo: 'Producto', ancho: 4 }, { titulo: 'Comensal', ancho: 2 }, { titulo: 'Cant.', ancho: 1, align: 'right' },
    { titulo: 'P. unitario', ancho: 2, align: 'right' }, { titulo: 'Subtotal', ancho: 2, align: 'right' }],
  items.map((i) => [i.producto, i.comensal ? `Comensal ${i.comensal}` : 'Compartido', i.cantidad, quetzales(i.precio_unitario), quetzales(i.subtotal)]),
  { total: ['Total', '', '', '', quetzales(pedido.total)] });

  subtitulo(doc, cuenta.modo === 'iguales' ? 'División en partes iguales' : 'División por consumo');
  if (cuenta.modo === 'iguales') {
    tabla(doc, [{ titulo: 'Comensal', ancho: 3 }, { titulo: 'Total a pagar', ancho: 2, align: 'right' }],
      cuenta.cuentas.map((c) => [`Comensal ${c.comensal}`, quetzales(c.total_a_pagar)]),
      { total: ['Total', quetzales(pedido.total)] });
  } else {
    tabla(doc, [{ titulo: 'Comensal', ancho: 3 }, { titulo: 'Lo suyo', ancho: 2, align: 'right' },
      { titulo: 'Parte compartida', ancho: 2, align: 'right' }, { titulo: 'Total a pagar', ancho: 2, align: 'right' }],
    cuenta.cuentas.map((c) => [`Comensal ${c.comensal}`, quetzales(c.propio), quetzales(c.compartido), quetzales(c.total_a_pagar)]),
    { total: ['Total', '', '', quetzales(pedido.total)] });
    if (cuenta.items_compartidos.length)
      doc.font('Helvetica').fontSize(8).fillColor(C.suave).text('Lo compartido se reparte en partes iguales; el último comensal absorbe los centavos del redondeo.', M);
  }
  pie(doc, `Generado el ${fmtFechaHora(Date.now())} por ${usuario.nombre}`);
  return doc;
};

export const ventasPdf = (d, usuario) => {
  const doc = nuevoDoc(`Reporte de ventas ${d.desde} a ${d.hasta}`);
  encabezado(doc, 'Reporte de ventas', `Del ${fmtDia(d.desde)} al ${fmtDia(d.hasta)} · solo pedidos entregados y pagados`);
  tarjetas(doc, [['Total vendido', quetzales(d.resumen.total_ventas)], ['Pedidos', String(d.resumen.num_pedidos)],
    ['Ticket promedio', quetzales(d.resumen.ticket_promedio)], ['Comensales', String(d.resumen.comensales)]]);

  subtitulo(doc, 'Ventas por día');
  const conVentas = d.ventas_por_dia.filter((v) => v.num_pedidos > 0);
  if (!conVentas.length) nota(doc, 'No hubo ventas en este rango.');
  else tabla(doc, [{ titulo: 'Fecha', ancho: 3 }, { titulo: 'Pedidos', ancho: 2, align: 'right' }, { titulo: 'Comensales', ancho: 2, align: 'right' }, { titulo: 'Total', ancho: 3, align: 'right' }],
    conVentas.map((v) => [fmtDia(v.fecha), v.num_pedidos, v.comensales, quetzales(v.total_ventas)]),
    { total: ['Total', d.resumen.num_pedidos, d.resumen.comensales, quetzales(d.resumen.total_ventas)] });

  subtitulo(doc, 'Productos más vendidos');
  if (!d.productos.length) nota(doc, 'Sin productos vendidos en este rango.');
  else tabla(doc, [{ titulo: '#', ancho: 0.6 }, { titulo: 'Producto', ancho: 4 }, { titulo: 'Categoría', ancho: 2 }, { titulo: 'Unidades', ancho: 1.5, align: 'right' }, { titulo: 'Ingresos', ancho: 2, align: 'right' }],
    d.productos.slice(0, 10).map((p, i) => [i + 1, p.producto, capitalizar(p.categoria), p.unidades, quetzales(p.ingresos)]));
  if (d.productos.length > 10) nota(doc, `Se muestran los 10 primeros de ${d.productos.length}; el Excel trae la lista completa.`);

  subtitulo(doc, 'Ventas por método de pago');
  if (!d.metodos_pago.length) nota(doc, 'Sin pagos en este rango.');
  else tabla(doc, [{ titulo: 'Método', ancho: 3 }, { titulo: 'Pedidos', ancho: 2, align: 'right' }, { titulo: 'Total', ancho: 3, align: 'right' }],
    d.metodos_pago.map((m) => [capitalizar(m.metodo_pago), m.num_pedidos, quetzales(m.total)]));

  subtitulo(doc, 'Insumos en o bajo el mínimo (al momento de generar)');
  if (!d.insumos_bajo_minimo.length) nota(doc, 'Ningún insumo está bajo el mínimo.');
  else tabla(doc, [{ titulo: 'Insumo', ancho: 4 }, { titulo: 'Stock', ancho: 2, align: 'right' }, { titulo: 'Mínimo', ancho: 2, align: 'right' }, { titulo: 'Faltante', ancho: 2, align: 'right' }],
    d.insumos_bajo_minimo.map((i) => [i.nombre, `${i.stock} ${i.unidad}`, `${i.stock_minimo} ${i.unidad}`, `${i.faltante} ${i.unidad}`]));

  pie(doc, `Generado el ${fmtFechaHora(Date.now())} por ${usuario.nombre}`);
  return doc;
};

const nota = (doc, texto) => doc.font('Helvetica').fontSize(9).fillColor(C.suave).text(texto, M).moveDown(0.4);
