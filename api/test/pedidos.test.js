// Requiere la API corriendo. TEST_ENTREGAR=1 incluye entregar y pagar (deja una venta real).
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL ?? 'http://localhost:3000/api';
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json().catch(() => null) };
};
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data.token;

// Las mesas desactivadas conservan su número (UNIQUE)
const crearMesaPrueba = async (token, capacidad = 4) => {
  for (let i = 0; i < 30; i++) {
    const r = await call('POST', '/mesas', { token, body: { numero: 200 + Math.floor(Math.random() * 790), capacidad } });
    if (r.status !== 409) return r;
  }
  throw new Error('No se encontró un número de mesa libre para las pruebas');
};

const sfx = Date.now().toString(36);
const stockDe = async (id) => (await call('GET', `/insumos/${id}`, { token: admin })).data.stock;
const nuevoPedido = (items, extra = {}) => ({ mesa_id: mesaId, num_comensales: 3, items, ...extra });

let admin, mesero, cocina, cocinaUserId, mesaId, pan, carne, soda, burger, refresco, nachos, pedidoId;
const creados = [];

test('preparación: usuarios, mesa, insumos y productos propios', async () => {
  admin = await login('admin@sabor.gt', 'Admin123!');
  mesero = await login('mesero@sabor.gt', 'Mesero123!');
  const u = await call('POST', '/users', { token: admin, body: { nombre: `Cocina Test ${sfx}`, email: `cocina${sfx}@sabor.gt`, password: 'Cocina1234', rol: 'cocina' } });
  cocinaUserId = u.data.id;
  cocina = await login(`cocina${sfx}@sabor.gt`, 'Cocina1234');

  mesaId = (await crearMesaPrueba(admin)).data.id;
  const ins = async (nombre, unidad, stock) => (await call('POST', '/insumos', { token: admin, body: { nombre: `${nombre} ${sfx}`, unidad, stock, stock_minimo: 1 } })).data.id;
  pan = await ins('Pan', 'unidad', 10); carne = await ins('Carne', 'g', 1000); soda = await ins('Soda', 'unidad', 6);
  const prod = async (nombre, categoria, precio, receta) => (await call('POST', '/productos', { token: admin, body: { nombre: `${nombre} ${sfx}`, categoria, precio, receta } })).data.id;
  burger = await prod('Burger', 'platillo', 35, [{ insumo_id: pan, cantidad: 1 }, { insumo_id: carne, cantidad: 150 }]);
  refresco = await prod('Refresco', 'bebida', 10, [{ insumo_id: soda, cantidad: 1 }]);
  nachos = await prod('Nachos', 'entrada', 30, []);
  assert.ok(admin && mesero && cocina && mesaId && pan && carne && soda && burger && refresco && nachos);
});

// ---------- VALIDACIÓN Y PERMISOS ----------
test('validación: todo en cero / vacío / extra => 400 con detalle', async () => {
  const cero = await call('POST', '/pedidos', { token: mesero, body: { mesa_id: 0, num_comensales: 0, items: [{ producto_id: 0, cantidad: 0 }] } });
  assert.equal(cero.status, 400);
  assert.ok(cero.data.details.length >= 4);
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: {} })).status, 400);
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([]) })).status, 400);                              // sin productos
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: burger, cantidad: 100 }]) })).status, 400);  // cantidad absurda
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: burger, cantidad: 1.5 }]) })).status, 400);
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: burger, cantidad: 1, comensal: 4 }]) })).status, 400);  // comensal 4 de 3
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: burger, cantidad: 1, precio_unitario: 0.01 }]) })).status, 400); // no se acepta precio del cliente
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: burger, cantidad: 1 }], { num_comensales: 5 }) })).status, 400); // capacidad 4
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: { ...nuevoPedido([{ producto_id: burger, cantidad: 1 }]), mesa_id: 999999 } })).status, 400);
  assert.equal((await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: 999999, cantidad: 1 }]) })).status, 400);
  assert.equal(await stockDe(pan), 10, 'ningún intento inválido debe tocar el inventario');
});

test('permisos: sin token 401; cocina no crea pedidos', async () => {
  assert.equal((await call('POST', '/pedidos', { body: nuevoPedido([{ producto_id: burger, cantidad: 1 }]) })).status, 401);
  assert.equal((await call('POST', '/pedidos', { token: cocina, body: nuevoPedido([{ producto_id: burger, cantidad: 1 }]) })).status, 403);
});

// ---------- CREAR ----------
test('crear: precios y total salen de la BD, mesa pasa a ocupada', async () => {
  const c = await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([
    { producto_id: burger, cantidad: 1, comensal: 1 }, { producto_id: refresco, cantidad: 1, comensal: 1 },   // comensal 1: 45
    { producto_id: burger, cantidad: 1, comensal: 2 },                                                        // comensal 2: 35
    { producto_id: refresco, cantidad: 1, comensal: 3 },                                                      // comensal 3: 10
    { producto_id: nachos, cantidad: 1 },                                                                     // compartido: 30
  ], { notas: 'Sin picante' }) });
  assert.equal(c.status, 201);
  pedidoId = c.data.id; creados.push(pedidoId);
  assert.equal(c.data.estado, 'pendiente');
  assert.equal(c.data.total, 120);
  assert.equal(c.data.items.length, 5);
  assert.equal(c.data.items[0].precio_unitario, 35);
  assert.equal(c.data.mesero, 'Mesero Demo');
  assert.equal((await call('GET', `/mesas/${mesaId}`, { token: admin })).data.estado, 'ocupada');
  const liberarAMano = await call('PUT', `/mesas/${mesaId}`, { token: admin, body: { estado: 'libre' } });
  assert.equal(liberarAMano.status, 409, 'con una cuenta sin pagar no se libera a mano');
  // detecta un desfase de zona horaria
  assert.ok(Math.abs(Date.now() - new Date(c.data.creado_en).getTime()) < 60_000, `creado_en desfasado: ${c.data.creado_en}`);
});

test('crear: descuenta insumos por receta y deja movimientos de consumo', async () => {
  assert.equal(await stockDe(pan), 8);          // 2 burgers
  assert.equal(await stockDe(carne), 700);      // 2 x 150
  assert.equal(await stockDe(soda), 4);         // 2 refrescos
  const m = await call('GET', `/insumos/${carne}/movimientos`, { token: admin });
  assert.equal(m.data[0].tipo, 'consumo');
  assert.equal(m.data[0].cantidad, -300);
  assert.equal(m.data[0].pedido_id, pedidoId);
  assert.equal((await call('GET', `/productos/${burger}`, { token: admin })).data.porciones, 4);   // carne: 700/150
});

// ---------- CUENTA DIVIDIDA ----------
test('cuenta por consumo: cada quien lo suyo + parte de lo compartido; la suma cuadra', async () => {
  const { status, data } = await call('GET', `/pedidos/${pedidoId}/cuenta`, { token: mesero });
  assert.equal(status, 200);
  assert.deepEqual(data.cuentas.map((c) => c.total_a_pagar), [55, 45, 20]);
  assert.equal(data.cuentas.reduce((s, c) => s + c.total_a_pagar, 0), data.total);
  assert.equal(data.cuentas[0].items.length, 2);
  assert.equal(data.items_compartidos.length, 1);
});
test('cuenta en partes iguales', async () => {
  const { data } = await call('GET', `/pedidos/${pedidoId}/cuenta?modo=iguales`, { token: mesero });
  assert.deepEqual(data.cuentas.map((c) => c.total_a_pagar), [40, 40, 40]);
  assert.equal((await call('GET', `/pedidos/${pedidoId}/cuenta?modo=otro`, { token: mesero })).status, 400);
});

// ---------- STOCK, EDICIÓN Y ESTADOS ----------
test('stock insuficiente => 409 con el detalle y SIN cambios (ni pedido a medias)', async () => {
  const antes = (await call('GET', `/pedidos?mesa_id=${mesaId}`, { token: admin })).data.length;
  const r = await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: burger, cantidad: 5 }]) });   // pan 8 ok, carne 700 < 750
  assert.equal(r.status, 409);
  assert.ok(r.data.details.some((d) => d.mensaje.includes('Carne')));
  assert.equal(await stockDe(pan), 8, 'el pan NO debe haberse descontado');
  assert.equal(await stockDe(carne), 700);
  assert.equal((await call('GET', `/pedidos?mesa_id=${mesaId}`, { token: admin })).data.length, antes);
});

test('editar pendiente: devuelve lo anterior y descuenta lo nuevo', async () => {
  const u = await call('PUT', `/pedidos/${pedidoId}`, { token: mesero, body: { num_comensales: 2, items: [
    { producto_id: burger, cantidad: 1, comensal: 1 }, { producto_id: refresco, cantidad: 1, comensal: 2 }] } });
  assert.equal(u.status, 200);
  assert.equal(u.data.total, 45);
  assert.equal(u.data.items.length, 2);
  assert.equal(u.data.num_comensales, 2);
  assert.equal(u.data.notas, 'Sin picante', 'sin "notas" en el body no se tocan');
  assert.equal(await stockDe(pan), 9);
  assert.equal(await stockDe(carne), 850);
  assert.equal(await stockDe(soda), 5);
  const tipos = (await call('GET', `/insumos/${pan}/movimientos`, { token: admin })).data.map((m) => m.tipo);
  assert.ok(tipos.includes('devolucion'));
  assert.equal((await call('PUT', `/pedidos/${pedidoId}`, { token: mesero, body: { num_comensales: 2, items: [{ producto_id: burger, cantidad: 99 }] } })).status, 409);
  assert.equal(await stockDe(pan), 9, 'la edición fallida no cambia nada');
  assert.equal((await call('PUT', '/pedidos/999999', { token: mesero, body: { num_comensales: 1, items: [{ producto_id: burger, cantidad: 1 }] } })).status, 404);
});

test('estados: no se salta pasos; cocina prepara pero no cancela; ya no se edita', async () => {
  assert.equal((await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: cocina, body: { estado: 'entregado' } })).status, 409);   // pendiente -> entregado
  assert.equal((await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: cocina, body: { estado: 'pagado' } })).status, 400);
  const p = await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: cocina, body: { estado: 'en_preparacion' } });
  assert.equal(p.status, 200);
  assert.equal(p.data.estado, 'en_preparacion');
  assert.equal((await call('PUT', `/pedidos/${pedidoId}`, { token: mesero, body: { num_comensales: 2, items: [{ producto_id: burger, cantidad: 1 }] } })).status, 409);
  assert.equal((await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: cocina, body: { estado: 'cancelado' } })).status, 403);
  const abiertos = await call('GET', '/pedidos?abiertos=true', { token: cocina });
  assert.ok(abiertos.data.some((x) => x.id === pedidoId));
});

test('cancelar: devuelve el stock exacto, libera la mesa y no devuelve dos veces', async () => {
  const c = await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: mesero, body: { estado: 'cancelado', motivo: 'El cliente se fue' } });
  assert.equal(c.status, 200);
  assert.equal(c.data.estado, 'cancelado');
  assert.equal(await stockDe(pan), 10);
  assert.equal(await stockDe(carne), 1000);
  assert.equal(await stockDe(soda), 6);
  assert.equal((await call('GET', `/mesas/${mesaId}`, { token: admin })).data.estado, 'libre');
  assert.equal((await call('PATCH', `/pedidos/${pedidoId}/estado`, { token: mesero, body: { estado: 'cancelado' } })).status, 409);
  assert.equal(await stockDe(pan), 10, 'una segunda cancelación no debe devolver otra vez');
  assert.equal((await call('GET', `/pedidos/${pedidoId}/cuenta`, { token: mesero })).status, 409);
  const mov = (await call('GET', `/insumos/${carne}/movimientos`, { token: admin })).data[0];
  assert.equal(mov.tipo, 'devolucion');
  assert.match(mov.motivo, /El cliente se fue/);
});

// ---------- CONCURRENCIA Y FILTROS ----------
test('concurrencia: 10 pedidos a la vez sobre 6 refrescos => exactamente 6 se crean', async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () =>
    call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: refresco, cantidad: 1, comensal: 1 }]) })));
  const ok = rs.filter((r) => r.status === 201);
  assert.ok(rs.every((r) => [201, 409].includes(r.status)), `estados inesperados: ${rs.map((r) => r.status)}`);
  assert.equal(ok.length, 6);
  assert.equal(await stockDe(soda), 0, 'nunca negativo');
  assert.equal((await call('GET', `/mesas/${mesaId}`, { token: admin })).data.estado, 'ocupada', 'con pedidos abiertos la mesa sigue ocupada');
  ok.forEach((r) => creados.push(r.data.id));
});

test('filtros del listado y fechas inválidas', async () => {
  const c = await call('GET', `/pedidos?mesa_id=${mesaId}&estado=cancelado`, { token: admin });
  assert.ok(c.data.some((p) => p.id === pedidoId));
  assert.ok(c.data.every((p) => p.estado === 'cancelado' && p.mesa_id === mesaId));
  assert.equal((await call('GET', '/pedidos?desde=ayer', { token: admin })).status, 400);
  assert.equal((await call('GET', '/pedidos?desde=2026-02-31', { token: admin })).status, 400, 'fecha que no existe');
  assert.equal((await call('GET', '/pedidos?desde=2026-10-20&hasta=2026-10-01', { token: admin })).status, 400);
  const hoy = new Date().toISOString().slice(0, 10);
  assert.equal((await call('GET', `/pedidos?desde=${hoy}&hasta=2099-01-01`, { token: admin })).status, 200);
  assert.equal((await call('GET', '/pedidos/999999', { token: admin })).status, 404);
});

// ---------- PAGO ----------
test('entregar NO libera la mesa; al pagar sí. No se paga dos veces ni se cancela (SOLO con TEST_ENTREGAR=1)', { skip: !process.env.TEST_ENTREGAR }, async () => {
  const mesa2 = (await crearMesaPrueba(admin)).data.id;
  const c = await call('POST', '/pedidos', { token: mesero, body: nuevoPedido([{ producto_id: nachos, cantidad: 2, comensal: null }], { mesa_id: mesa2 }) });
  assert.equal(c.status, 201);
  assert.equal(c.data.total, 60);
  await call('PATCH', `/pedidos/${c.data.id}/estado`, { token: cocina, body: { estado: 'en_preparacion' } });
  assert.equal((await call('PATCH', `/pedidos/${c.data.id}/estado`, { token: cocina, body: { estado: 'entregado' } })).status, 200);
  const pid = c.data.id;
  assert.equal((await call('POST', `/pedidos/${pid}/pago`, { token: cocina, body: { metodo_pago: 'efectivo' } })).status, 403, 'cocina no cobra');
  assert.equal((await call('POST', `/pedidos/${pid}/pago`, { token: mesero, body: { metodo_pago: 'bitcoin' } })).status, 400);
  assert.equal((await call('GET', `/mesas/${mesa2}`, { token: admin })).data.estado, 'ocupada', 'entregado pero sin pagar: sigue ocupada');
  assert.ok((await call('GET', '/pedidos?por_cobrar=true', { token: mesero })).data.some((p) => p.id === pid));
  assert.equal((await call('PATCH', `/pedidos/${pid}/estado`, { token: mesero, body: { estado: 'cancelado' } })).status, 409);
  const pago = await call('POST', `/pedidos/${pid}/pago`, { token: mesero, body: { metodo_pago: 'tarjeta' } });
  assert.equal(pago.status, 200);
  assert.equal(pago.data.pagado, 1);
  assert.equal(pago.data.metodo_pago, 'tarjeta');
  assert.equal((await call('GET', `/mesas/${mesa2}`, { token: admin })).data.estado, 'libre', 'pagada: la mesa se libera');
  assert.equal((await call('POST', `/pedidos/${pid}/pago`, { token: mesero, body: { metodo_pago: 'efectivo' } })).status, 409, 'no se paga dos veces');
  await call('DELETE', `/mesas/${mesa2}`, { token: admin });
});

// ---------- LIMPIEZA ----------
test('limpieza: cancelar lo que quedó abierto y desactivar los datos de prueba', async () => {
  for (const id of creados) {
    const p = (await call('GET', `/pedidos/${id}`, { token: admin })).data;
    if (['pendiente', 'en_preparacion'].includes(p.estado)) await call('PATCH', `/pedidos/${id}/estado`, { token: admin, body: { estado: 'cancelado' } });
  }
  assert.equal(await stockDe(soda), 6, 'todo el stock vuelve a su valor inicial');
  assert.equal((await call('GET', `/mesas/${mesaId}`, { token: admin })).data.estado, 'libre');
  for (const id of [burger, refresco, nachos]) await call('DELETE', `/productos/${id}`, { token: admin });
  for (const id of [pan, carne, soda]) await call('DELETE', `/insumos/${id}`, { token: admin });
  await call('DELETE', `/mesas/${mesaId}`, { token: admin });
  await call('DELETE', `/users/${cocinaUserId}`, { token: admin });
});
