// Requiere la API corriendo. TEST_ENTREGAR=1 incluye cobrar un pedido (deja una venta real).
import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

const BASE = process.env.API_URL ?? 'http://localhost:3000/api';
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json().catch(() => null) };
};
const descargar = async (path, token) => {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, tipo: res.headers.get('content-type'), disposicion: res.headers.get('content-disposition'), buffer: Buffer.from(await res.arrayBuffer()) };
};
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data.token;
const esPdf = (b) => b.subarray(0, 5).toString() === '%PDF-';
const esXlsx = (b) => b.subarray(0, 2).toString() === 'PK';
const centavos = (arr, campo) => arr.reduce((s, x) => s + Math.round(x[campo] * 100), 0) / 100;

// Las mesas desactivadas conservan su número (UNIQUE)
const crearMesaPrueba = async (token, capacidad = 4) => {
  for (let i = 0; i < 30; i++) {
    const r = await call('POST', '/mesas', { token, body: { numero: 200 + Math.floor(Math.random() * 790), capacidad } });
    if (r.status !== 409) return r;
  }
  throw new Error('No se encontró un número de mesa libre para las pruebas');
};

const sfx = Date.now().toString(36);
let admin, mesero, cocina, cocinaUserId, mesaId, productoId, pedidoId, hoy;

test('preparación: usuarios, mesa, producto y un pedido pendiente', async () => {
  admin = await login('admin@sabor.gt', 'Admin123!');
  mesero = await login('mesero@sabor.gt', 'Mesero123!');
  cocinaUserId = (await call('POST', '/users', { token: admin, body: { nombre: `Cocina Rep ${sfx}`, email: `cocinarep${sfx}@sabor.gt`, password: 'Cocina1234', rol: 'cocina' } })).data.id;
  cocina = await login(`cocinarep${sfx}@sabor.gt`, 'Cocina1234');
  mesaId = (await crearMesaPrueba(admin)).data.id;
  productoId = (await call('POST', '/productos', { token: admin, body: { nombre: `Pupusa ${sfx}`, categoria: 'platillo', precio: 12.5, receta: [] } })).data.id;
  const p = await call('POST', '/pedidos', { token: mesero, body: { mesa_id: mesaId, num_comensales: 3,
    items: [{ producto_id: productoId, cantidad: 2, comensal: 1 }, { producto_id: productoId, cantidad: 2, comensal: null }] } });
  assert.equal(p.status, 201);
  pedidoId = p.data.id;
  assert.ok(admin && mesero && cocina && mesaId && productoId && pedidoId);
});

// ---------- PERMISOS ----------
test('permisos: ventas solo admin; la cuenta la imprimen admin y mesero, cocina no', async () => {
  assert.equal((await call('GET', '/reportes/ventas')).status, 401);
  for (const ruta of ['/reportes/ventas', '/reportes/ventas/excel', '/reportes/ventas/pdf'])
    assert.equal((await call('GET', ruta, { token: mesero })).status, 403, ruta);
  assert.equal((await call('GET', `/reportes/cuenta/${pedidoId}/pdf`, { token: cocina })).status, 403);
  assert.equal((await descargar(`/reportes/cuenta/${pedidoId}/pdf`, mesero)).status, 200);
});

// ---------- VALIDACIONES ----------
test('validación de fechas y parámetros => 400 con detalle', async () => {
  const mal = async (q) => {
    const r = await call('GET', `/reportes/ventas${q}`, { token: admin });
    assert.equal(r.status, 400, q);
    assert.ok(r.data.details.length >= 1, q);
  };
  await mal('?desde=2026-02-31');                         // no existe
  await mal('?desde=ayer');
  await mal('?desde=2026-10-20&hasta=2026-10-01');        // al revés
  await mal('?desde=2025-01-01&hasta=2026-10-20');        // más de 366 días
  await mal('?desde=2026-10-01&otro=1');                  // parámetro desconocido
  assert.equal((await call('GET', `/reportes/cuenta/${pedidoId}/pdf?tipo=mitad`, { token: admin })).status, 400);
  assert.equal((await call('GET', '/reportes/cuenta/abc/pdf', { token: admin })).status, 400);
  assert.equal((await call('GET', '/reportes/cuenta/999999/pdf', { token: admin })).status, 404);
});

// ---------- VENTAS ----------
test('ventas sin fechas: últimos 30 días hasta hoy, sin huecos', async () => {
  const r = await call('GET', '/reportes/ventas', { token: admin });
  assert.equal(r.status, 200);
  hoy = r.data.hasta;
  assert.match(hoy, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(r.data.ventas_por_dia.length, 30);
  assert.equal(r.data.ventas_por_dia.at(-1).fecha, hoy);
  assert.equal(r.data.ventas_por_dia[0].fecha, r.data.desde);
});

test('ventas: los totales cuadran entre sí (días, pedidos, productos, métodos)', async () => {
  const { data } = await call('GET', `/reportes/ventas?desde=${hoy}&hasta=${hoy}`, { token: admin });
  const total = data.resumen.total_ventas;
  assert.equal(centavos(data.ventas_por_dia, 'total_ventas'), total);
  assert.equal(centavos(data.pedidos, 'total'), total);
  assert.equal(centavos(data.productos, 'ingresos'), total);
  assert.equal(centavos(data.metodos_pago, 'total'), total);
  assert.equal(data.resumen.num_pedidos, data.pedidos.length);
  assert.ok(data.pedidos.every((p) => p.metodo_pago), 'solo pedidos pagados');
  assert.ok(!data.pedidos.some((p) => p.id === pedidoId), 'un pedido pendiente no es venta');
});

test('Excel: archivo válido, 5 hojas y el total coincide con el JSON', async () => {
  const r = await descargar(`/reportes/ventas/excel?desde=${hoy}&hasta=${hoy}`, admin);
  assert.equal(r.status, 200);
  assert.match(r.tipo, /spreadsheetml/);
  assert.match(r.disposicion, new RegExp(`ventas_${hoy}_${hoy}\\.xlsx`));
  assert.ok(esXlsx(r.buffer));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(r.buffer);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Resumen', 'Ventas por día', 'Productos', 'Pedidos', 'Insumos bajo mínimo']);
  const { data } = await call('GET', `/reportes/ventas?desde=${hoy}&hasta=${hoy}`, { token: admin });
  const ws = wb.getWorksheet('Ventas por día');
  const fila = ws.getRow(ws.rowCount);
  assert.equal(fila.getCell(1).value, 'Total');
  assert.equal(fila.getCell(4).value.result ?? 0, data.resumen.total_ventas);     // exceljs no guarda un resultado 0
  assert.match(fila.getCell(4).value.formula, /^SUM\(D2:D\d+\)$/);
});

test('PDF de ventas: archivo válido con nombre por rango', async () => {
  const r = await descargar(`/reportes/ventas/pdf?desde=${hoy}&hasta=${hoy}`, admin);
  assert.equal(r.status, 200);
  assert.equal(r.tipo, 'application/pdf');
  assert.match(r.disposicion, new RegExp(`ventas_${hoy}_${hoy}\\.pdf`));
  assert.ok(esPdf(r.buffer));
});

// ---------- CUENTA ----------
const paginas = (b) => (b.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

test('PDF de la cuenta: una sola, partes iguales y una hoja por comensal', async () => {
  for (const [tipo, hojas] of [['unica', 1], ['iguales', 1], ['consumo', 3]]) {
    const r = await descargar(`/reportes/cuenta/${pedidoId}/pdf?tipo=${tipo}`, admin);
    assert.equal(r.status, 200, tipo);
    assert.match(r.disposicion, new RegExp(`cuenta_pedido_${pedidoId}\\.pdf`));
    assert.ok(esPdf(r.buffer), tipo);
    assert.equal(paginas(r.buffer), hojas, `${tipo}: ${hojas} página(s)`);
  }
  assert.equal(paginas((await descargar(`/reportes/cuenta/${pedidoId}/pdf`, admin)).buffer), 1, 'sin tipo = una sola cuenta');
});

// ---------- VENTA REAL ----------
test('un pedido entra a ventas solo al pagarse (SOLO con TEST_ENTREGAR=1)', { skip: !process.env.TEST_ENTREGAR }, async () => {
  const mesa2 = (await crearMesaPrueba(admin)).data.id;
  const c = await call('POST', '/pedidos', { token: mesero, body: { mesa_id: mesa2, num_comensales: 2, items: [{ producto_id: productoId, cantidad: 3, comensal: null }] } });
  assert.equal(c.data.total, 37.5);
  for (const estado of ['en_preparacion', 'entregado']) await call('PATCH', `/pedidos/${c.data.id}/estado`, { token: admin, body: { estado } });
  const enVentas = async () => (await call('GET', `/reportes/ventas?desde=${hoy}&hasta=${hoy}`, { token: admin })).data.pedidos.find((p) => p.id === c.data.id);
  assert.equal(await enVentas(), undefined, 'entregado sin pagar todavía no es venta');
  await call('POST', `/pedidos/${c.data.id}/pago`, { token: mesero, body: { metodo_pago: 'efectivo' } });
  const venta = await enVentas();
  assert.equal(venta.total, 37.5);
  assert.equal(venta.metodo_pago, 'efectivo');
  await call('DELETE', `/mesas/${mesa2}`, { token: admin });
});

// ---------- LIMPIEZA ----------
test('cuenta de un pedido cancelado => 409; limpieza', async () => {
  await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: admin, body: { estado: 'cancelado' } });
  assert.equal((await call('GET', `/reportes/cuenta/${pedidoId}/pdf`, { token: admin })).status, 409);
  await call('DELETE', `/productos/${productoId}`, { token: admin });
  await call('DELETE', `/mesas/${mesaId}`, { token: admin });
  await call('DELETE', `/users/${cocinaUserId}`, { token: admin });
});
