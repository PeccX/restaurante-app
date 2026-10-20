import test from 'node:test';
import assert from 'node:assert/strict';
import { dividirIguales } from '../src/modules/pedidos/pedidos.cuenta.js';

const suma = (a) => Math.round(a.reduce((s, x) => s + x, 0) * 100) / 100;

test('dividirIguales: exacto', () => assert.deepEqual(dividirIguales(120, 3), [40, 40, 40]));
test('dividirIguales: sobrante de centavos va al último', () => assert.deepEqual(dividirIguales(100, 3), [33.33, 33.33, 33.34]));
test('dividirIguales: un solo comensal paga todo', () => assert.deepEqual(dividirIguales(87.5, 1), [87.5]));
test('dividirIguales: la suma siempre cuadra con el total', () => {
  for (const total of [0.01, 1, 9.99, 33.33, 100, 123.45, 999.99])
    for (let n = 1; n <= 12; n++) assert.equal(suma(dividirIguales(total, n)), total, `total=${total} n=${n}`);
});
