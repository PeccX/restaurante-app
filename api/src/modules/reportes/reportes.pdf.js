import PDFDocument from 'pdfkit';
import { fmtDia, fmtFechaHora, quetzales, capitalizar } from '../../utils/formato.js';

const C = { acento: '#EA6A12', texto: '#07143B', suave: '#6B6E75', linea: '#EAE8E7', zebra: '#FFF5EE' };
const M = 50;                                     // margen

const nuevoDoc = (titulo) => new PDFDocument({ size: 'LETTER', margin: M, bufferPages: true, info: { Title: titulo, Author: 'Sabor Chapín' } });
const ancho = (doc) => doc.page.width - 2 * M;

const encabezado = (doc, titulo, subtitulo) => {
  doc.rect(0, 0, doc.page.width, 6).fill(C.acento);
  doc.fillColor(C.acento).font('Helvetica-Bold').fontSize(20).text('Sabor Chapín', M, M);
  doc.fillColor(C.suave).font('Helvetica').fontSize(9).text('Quetzaltenango, Guatemala');
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
    if (valores.length === 1 && cols.length > 1) doc.text(String(valores[0]), x + 4, y + 5, { width: W - 8, height: 11, ellipsis: true });
    else cols.forEach((c, i) => {
      doc.text(String(valores[i] ?? ''), x + 4, y + 5, { width: c.w - 8, height: 11, align: c.align ?? 'left', ellipsis: true });
      x += c.w;
    });
    doc.x = M; doc.y = y + ALTO;
  };
  const cabecera = () => fila(cols.map((c) => c.titulo), { fondo: C.acento, negrita: true, color: '#ffffff' });
  cabecera();
  let z = 0;
  filas.forEach((f) => {
    if (doc.y + ALTO > doc.page.height - M - 20) { doc.addPage(); cabecera(); }
    if (f.grupo) { fila([f.grupo], { fondo: C.linea, negrita: true }); z = 0; return; }
    fila(f.valores ?? f, { fondo: z++ % 2 ? C.zebra : null, color: f.tenue ? C.suave : C.texto });
  });
  if (total) {
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(0.8).strokeColor(C.texto).stroke();
    fila(total, { negrita: true });
  }
  doc.moveDown(0.4);
};

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

const TIPOS = { unica: 'Una sola cuenta', iguales: 'Partes iguales', consumo: 'Por comensal' };
const COLS_CONSUMO = [{ titulo: 'Producto', ancho: 5 }, { titulo: 'Cant.', ancho: 1, align: 'right' },
  { titulo: 'P. unitario', ancho: 2, align: 'right' }, { titulo: 'Subtotal', ancho: 2, align: 'right' }];
const fila = (f) => [f.producto, f.cantidad, quetzales(f.precio), quetzales(f.subtotal)];

const resumen = (doc, pares) => {
  const W = 280, x = M + ancho(doc) - W;
  espacio(doc, pares.length * 20 + 20);
  doc.moveDown(0.3);
  pares.forEach(([k, v], i) => {
    const ultimo = i === pares.length - 1, y = doc.y;
    if (ultimo && pares.length > 1) doc.moveTo(x, y - 3).lineTo(x + W, y - 3).lineWidth(0.8).strokeColor(C.texto).stroke();
    doc.font(ultimo ? 'Helvetica-Bold' : 'Helvetica').fontSize(ultimo ? 12 : 10).fillColor(ultimo ? C.texto : C.suave)
      .text(k, x, y + 2, { width: W - 90 })
      .text(quetzales(v), x + W - 90, y + 2, { width: 90, align: 'right' });
    doc.y = y + (ultimo ? 22 : 18);
  });
  doc.x = M;
};

const recuadro = (doc, titulo, texto) => {
  const W = ancho(doc), alto = doc.font('Helvetica').fontSize(9).heightOfString(texto, { width: W - 32 }) + 38;
  espacio(doc, alto + 16);
  doc.moveDown(0.8);
  const y = doc.y;
  doc.roundedRect(M, y, W, alto, 8).fillAndStroke(C.zebra, '#F5C7A5');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.acento).text(titulo, M + 16, y + 12);
  doc.font('Helvetica').fontSize(9).fillColor(C.texto).text(texto, M + 16, y + 26, { width: W - 32 });
  doc.x = M; doc.y = y + alto;
};

export const cuentaPdf = ({ pedido, hojas, tipo }, usuario) => {
  const doc = nuevoDoc(`Cuenta pedido ${pedido.id}`);
  hojas.forEach((h, i) => {
    if (i) doc.addPage();
    encabezado(doc, `Cuenta del pedido #${pedido.id}`, `Mesa ${pedido.mesa}${h.subtitulo ? `, ${h.subtitulo}` : ''}`);
    datos(doc, [
      ['Mesero', pedido.mesero], ['Comensales', String(pedido.num_comensales)],
      ['Fecha', fmtFechaHora(pedido.creado_en)], ['Estado', capitalizar(pedido.estado)],
      ['Pago', pedido.pagado_en ? `${capitalizar(pedido.metodo_pago)}, ${fmtFechaHora(pedido.pagado_en)}` : 'Pendiente de pago'],
      ['Cuenta', TIPOS[tipo]],
    ]);
    subtitulo(doc, 'Consumo');
    tabla(doc, COLS_CONSUMO, [
      ...h.filas.map(fila),
      ...(h.compartidos ? [{ grupo: `Compartido entre ${h.compartidos.n}` }, ...h.compartidos.filas.map((f) => ({ valores: fila(f), tenue: true }))] : []),
    ]);
    resumen(doc, h.resumen);
    if (h.ajuste) {
      const c = quetzales(Math.abs(h.ajuste) / 100);
      recuadro(doc, 'Información', h.quien
        ? `La parte del ${h.quien} es de ${quetzales(h.conAjuste)}: ${h.ajuste > 0 ? `incluye ${c} de ajuste` : `se restó ${c}`} por redondeo para que la suma de las partes dé el total exacto.`
        : h.ajuste > 0
          ? `Incluye ${c} de ajuste por redondeo para que la suma de las cuentas dé el total exacto.`
          : `Se restó ${c} por redondeo para que la suma de las cuentas dé el total exacto.`);
    }
  });
  pie(doc, `Generado el ${fmtFechaHora(Date.now())} por ${usuario.nombre}`);
  return doc;
};

export const ventasPdf = (d, usuario) => {
  const doc = nuevoDoc(`Reporte de ventas ${d.desde} a ${d.hasta}`);
  encabezado(doc, 'Reporte de ventas', `Del ${fmtDia(d.desde)} al ${fmtDia(d.hasta)}. Solo pedidos entregados y pagados.`);
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
