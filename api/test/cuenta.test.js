import test from 'node:test';
import assert from 'node:assert/strict';
import { dividirIguales } from '../src/modules/pedidos/pedidos.cuenta.js';
import { agrupar, armarHojas } from '../src/modules/reportes/reportes.cuenta.js';

const suma = (a) => Math.round(a.reduce((s, x) => s + x, 0) * 100) / 100;

test('dividirIguales: exacto', () => assert.deepEqual(dividirIguales(120, 3), [40, 40, 40]));
test('dividirIguales: el último ajusta los centavos (de más)', () => assert.deepEqual(dividirIguales(100, 3), [33.33, 33.33, 33.34]));
test('dividirIguales: el último ajusta los centavos (de menos), nunca más de 1 centavo entre 3', () => assert.deepEqual(dividirIguales(203, 3), [67.67, 67.67, 67.66]));
test('dividirIguales: un solo comensal paga todo', () => assert.deepEqual(dividirIguales(87.5, 1), [87.5]));
test('dividirIguales: la suma siempre cuadra con el total', () => {
  for (const total of [0.01, 1, 9.99, 33.33, 100, 123.45, 999.99])
    for (let n = 1; n <= 12; n++) assert.equal(suma(dividirIguales(total, n)), total, `total=${total} n=${n}`);
});

// ---------- HOJAS DE LA CUENTA (PDF) ----------

const item = (producto_id, producto, precio_unitario, cantidad, comensal = null) => ({ producto_id, producto, precio_unitario, cantidad, comensal });
const pedido = {
  num_comensales: 3, total: 130,
  items: [item(1, 'Burger', 35, 1, 1), item(2, 'Refresco', 10, 1, 1), item(1, 'Burger', 35, 1, 2), item(2, 'Refresco', 10, 1, 3), item(3, 'Nachos', 30, 1), item(2, 'Refresco', 10, 1)],
};
// lo que devolvería v_cuenta_consumo: compartido 40 entre 3 = 13.33 / 13.33 / 13.34
const vista = [
  { comensal: 1, propio: 45, compartido: 13.33, total_a_pagar: 58.33 },
  { comensal: 2, propio: 35, compartido: 13.33, total_a_pagar: 48.33 },
  { comensal: 3, propio: 10, compartido: 13.34, total_a_pagar: 23.34 },
];

test('agrupar: mismo producto de distintos comensales es una sola línea', () => {
  const f = agrupar(pedido.items);
  assert.deepEqual(f.find((x) => x.producto === 'Burger'), { producto: 'Burger', cantidad: 2, precio: 35, subtotal: 70 });
  assert.equal(f.find((x) => x.producto === 'Refresco').cantidad, 3);
});

test('una sola cuenta: una hoja, sin división ni ajuste', () => {
  const [h, ...resto] = armarHojas(pedido, 'unica', vista);
  assert.equal(resto.length, 0);
  assert.deepEqual(h.resumen, [['Total a pagar', 130]]);
  assert.equal(h.ajuste, 0);
});

test('partes iguales: 130 / 3 => 43.33 c/u y el último absorbe 0.01', () => {
  const [h] = armarHojas(pedido, 'iguales', vista);
  assert.deepEqual(h.resumen, [['Total', 130], ['Cada persona (3)', 43.33]]);
  assert.equal(h.ajuste, 1);
  assert.equal(h.conAjuste, 43.34);
});

test('por comensal: una hoja cada uno, solo lo suyo y lo compartido aparte; el ajuste solo en la última', () => {
  const hojas = armarHojas(pedido, 'consumo', vista);
  assert.equal(hojas.length, 3);
  assert.deepEqual(hojas[0].filas.map((f) => f.producto), ['Burger', 'Refresco']);
  assert.deepEqual(hojas[0].compartidos.filas.map((f) => f.producto), ['Nachos', 'Refresco']);
  assert.deepEqual(hojas.map((h) => h.resumen.at(-1)[1]), [58.33, 48.33, 23.34]);
  assert.deepEqual(hojas.map((h) => h.ajuste), [0, 0, 1]);
});

test('por comensal: quien no consumió nada no recibe hoja', () => {
  const sinNada = { ...pedido, num_comensales: 2, items: [item(1, 'Burger', 35, 1, 1)] };
  const hojas = armarHojas(sinNada, 'consumo', [{ comensal: 1, propio: 35, compartido: 0, total_a_pagar: 35 }, { comensal: 2, propio: 0, compartido: 0, total_a_pagar: 0 }]);
  assert.equal(hojas.length, 1);
  assert.deepEqual(hojas[0].resumen, [['Total a pagar', 35]]);
});
