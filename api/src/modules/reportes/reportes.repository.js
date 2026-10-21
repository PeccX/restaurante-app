import { query } from '../../config/db.js';

// Sin DATE() en pagado_en para que use el índice
const PAGADOS = "pe.estado = 'entregado' AND pe.pagado_en >= ? AND pe.pagado_en < ? + INTERVAL 1 DAY";

export const ventasPorDia = (desde, hasta) => query(
  `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, num_pedidos, comensales, total_ventas
   FROM v_ventas_diarias WHERE fecha BETWEEN ? AND ? ORDER BY fecha`, [desde, hasta]);

export const productosVendidos = (desde, hasta) => query(
  `SELECT p.nombre AS producto, p.categoria, SUM(i.cantidad) AS unidades, SUM(i.cantidad * i.precio_unitario) AS ingresos
   FROM pedido_items i JOIN pedidos pe ON pe.id = i.pedido_id JOIN productos p ON p.id = i.producto_id
   WHERE ${PAGADOS}
   GROUP BY p.id, p.nombre, p.categoria ORDER BY unidades DESC, ingresos DESC`, [desde, hasta]);

export const porMetodoPago = (desde, hasta) => query(
  `SELECT pe.metodo_pago, COUNT(*) AS num_pedidos, SUM(pe.total) AS total
   FROM pedidos pe WHERE ${PAGADOS} GROUP BY pe.metodo_pago ORDER BY total DESC`, [desde, hasta]);

export const pedidosPagados = (desde, hasta) => query(
  `SELECT pe.id, pe.pagado_en, m.numero AS mesa, u.nombre AS mesero, pe.num_comensales, pe.metodo_pago, pe.total
   FROM pedidos pe JOIN mesas m ON m.id = pe.mesa_id JOIN usuarios u ON u.id = pe.usuario_id
   WHERE ${PAGADOS} ORDER BY pe.pagado_en`, [desde, hasta]);

export const insumosBajoMinimo = () =>
  query('SELECT nombre, unidad, stock, stock_minimo, faltante FROM v_insumos_bajo_minimo ORDER BY faltante DESC');
