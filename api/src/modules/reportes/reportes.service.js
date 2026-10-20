import * as repo from './reportes.repository.js';
import * as pedidos from '../pedidos/pedidos.service.js';
import { listaDeDias } from './reportes.schema.js';

const centavos = (filas, campo) => filas.reduce((s, f) => s + Math.round(f[campo] * 100), 0) / 100;

export const ventas = async ({ desde, hasta }) => {
  const [dias, productos, metodos, detalle, insumos] = await Promise.all([
    repo.ventasPorDia(desde, hasta), repo.productosVendidos(desde, hasta), repo.porMetodoPago(desde, hasta),
    repo.pedidosPagados(desde, hasta), repo.insumosBajoMinimo(),
  ]);
  // Días sin ventas también aparecen (en 0) para que la serie no tenga huecos
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const ventas_por_dia = listaDeDias(desde, hasta).map((fecha) =>
    porFecha.get(fecha) ?? { fecha, num_pedidos: 0, comensales: 0, total_ventas: 0 });

  const total = centavos(detalle, 'total');
  const num_pedidos = detalle.length;
  return {
    desde, hasta,
    resumen: {
      total_ventas: total, num_pedidos,
      comensales: detalle.reduce((s, p) => s + p.num_comensales, 0),
      ticket_promedio: num_pedidos ? Math.round((total / num_pedidos) * 100) / 100 : 0,
    },
    ventas_por_dia, productos, metodos_pago: metodos, pedidos: detalle, insumos_bajo_minimo: insumos,
  };
};

export const cuenta = async (id, { modo }) => {
  const cuenta = await pedidos.cuenta(id, { modo });     // 404 / 409 (cancelado) salen de aquí
  return { pedido: await pedidos.get(id), cuenta };
};
