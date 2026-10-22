import { dividirIguales } from '../pedidos/pedidos.cuenta.js';

const cent = (n) => Math.round(Number(n) * 100);
const q = (c) => c / 100;

export const agrupar = (items) => Object.values(items.reduce((m, i) => {
  const k = `${i.producto_id}-${i.precio_unitario}`;
  const f = (m[k] ??= { producto: i.producto, cantidad: 0, precio: i.precio_unitario, subtotal: 0 });
  f.cantidad += i.cantidad;
  f.subtotal = q(cent(f.subtotal) + cent(i.precio_unitario) * i.cantidad);
  return m;
}, {}));

export const armarHojas = (pedido, tipo, porConsumo) => {
  const n = pedido.num_comensales;
  if (tipo === 'unica') return [{ filas: agrupar(pedido.items), resumen: [['Total a pagar', pedido.total]], ajuste: 0 }];

  if (tipo === 'iguales') {
    const partes = dividirIguales(pedido.total, n);
    const ajuste = cent(partes.at(-1)) - cent(partes[0]);
    return [{
      subtitulo: `dividida entre ${n}`,
      filas: agrupar(pedido.items),
      resumen: [['Total', pedido.total], [`Cada persona (${n})`, partes[0]]],
      ajuste, conAjuste: partes.at(-1), quien: `comensal ${n}`,
    }];
  }

  const compartidos = agrupar(pedido.items.filter((i) => i.comensal === null));
  const totalCompartido = compartidos.reduce((s, f) => s + cent(f.subtotal), 0);
  return porConsumo
    .filter((c) => c.total_a_pagar > 0)
    .map((c) => {
      const propias = agrupar(pedido.items.filter((i) => i.comensal === c.comensal));
      const exacto = cent(c.propio) + totalCompartido / n;
      return {
        subtitulo: `comensal ${c.comensal} de ${n}`,
        filas: propias,
        compartidos: compartidos.length ? { n, filas: compartidos } : null,
        resumen: [
          ...(propias.length && compartidos.length ? [['Lo suyo', c.propio], ['Su parte de lo compartido', c.compartido]] : []),
          ['Total a pagar', c.total_a_pagar],
        ],
        ajuste: cent(c.total_a_pagar) - Math.round(exacto),
      };
    });
};
