// Requiere la API corriendo
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
let admin, mesero, mesaId, insumoId, insumo2Id, productoId;

test('preparación: login admin y mesero', async () => {
  admin = await login('admin@sabor.gt', 'Admin123!');
  mesero = await login('mesero@sabor.gt', 'Mesero123!');
  assert.ok(admin && mesero);
});

// ---------- MESAS ----------
test('mesas: listar (mesero puede), crear solo admin', async () => {
  const lista = await call('GET', '/mesas', { token: mesero });
  assert.equal(lista.status, 200);
  assert.ok(lista.data.length >= 6);
  assert.equal((await call('POST', '/mesas', { token: mesero, body: { numero: 999 } })).status, 403);
  assert.equal((await call('GET', '/mesas')).status, 401);
});
test('mesas: validación (número 0, capacidad texto, campo extra)', async () => {
  const { status, data } = await call('POST', '/mesas', { token: admin, body: { numero: 0, capacidad: 'x', otro: 1 } });
  assert.equal(status, 400);
  assert.ok(data.details.length >= 3);
});
test('mesas: crear, duplicado 409, actualizar, filtrar', async () => {
  const c = await crearMesaPrueba(admin, 6);
  assert.equal(c.status, 201);
  const numeroMesa = c.data.numero;
  assert.equal(c.data.estado, 'libre');
  mesaId = c.data.id;
  assert.equal((await call('POST', '/mesas', { token: admin, body: { numero: numeroMesa } })).status, 409);
  const u = await call('PUT', `/mesas/${mesaId}`, { token: admin, body: { capacidad: 8, estado: 'ocupada' } });
  assert.equal(u.data.capacidad, 8);
  assert.equal(u.data.estado, 'ocupada');
  const f = await call('GET', '/mesas?estado=ocupada', { token: admin });
  assert.ok(f.data.some((m) => m.id === mesaId));
  assert.equal((await call('PUT', `/mesas/${mesaId}`, { token: admin, body: { estado: 'volando' } })).status, 400);
});
test('mesas: no se puede eliminar una mesa ocupada; libre sí (queda inactiva)', async () => {
  assert.equal((await call('DELETE', `/mesas/${mesaId}`, { token: admin })).status, 409);
  await call('PUT', `/mesas/${mesaId}`, { token: admin, body: { estado: 'libre' } });
  assert.equal((await call('DELETE', `/mesas/${mesaId}`, { token: admin })).status, 204);
  assert.equal((await call('GET', `/mesas/${mesaId}`, { token: admin })).data.activo, 0);
  assert.equal((await call('GET', '/mesas/999999', { token: admin })).status, 404);
});

// ---------- INSUMOS ----------
test('insumos: validación al crear', async () => {
  const { status, data } = await call('POST', '/insumos', { token: admin, body: { nombre: 'A', unidad: 'kg', stock: -5 } });
  assert.equal(status, 400);
  assert.ok(data.details.length >= 3);
});
test('insumos: crear con stock inicial registra movimiento', async () => {
  const c = await call('POST', '/insumos', { token: admin, body: { nombre: `Harina ${sfx}`, unidad: 'g', stock: 1000, stock_minimo: 200 } });
  assert.equal(c.status, 201);
  assert.equal(c.data.stock, 1000);
  insumoId = c.data.id;
  const m = await call('GET', `/insumos/${insumoId}/movimientos`, { token: admin });
  assert.equal(m.data.length, 1);
  assert.equal(m.data[0].motivo, 'Stock inicial');
  assert.equal((await call('POST', '/insumos', { token: admin, body: { nombre: `Harina ${sfx}`, unidad: 'g' } })).status, 409);
  const c2 = await call('POST', '/insumos', { token: admin, body: { nombre: `Azúcar ${sfx}`, unidad: 'g', stock: 500 } });
  insumo2Id = c2.data.id;
});
test('insumos: el stock no se edita directo (PUT) sino con ajustes', async () => {
  assert.equal((await call('PUT', `/insumos/${insumoId}`, { token: admin, body: { stock: 5 } })).status, 400);
  const u = await call('PUT', `/insumos/${insumoId}`, { token: admin, body: { stock_minimo: 300 } });
  assert.equal(u.data.stock_minimo, 300);
});
test('insumos: ajuste positivo y negativo dejan historial y stock correcto', async () => {
  const a = await call('POST', `/insumos/${insumoId}/ajuste`, { token: admin, body: { cantidad: 250.5, motivo: 'Compra del día' } });
  assert.equal(a.status, 200);
  assert.equal(a.data.stock, 1250.5);
  const b = await call('POST', `/insumos/${insumoId}/ajuste`, { token: admin, body: { cantidad: -50.5, motivo: 'Merma' } });
  assert.equal(b.data.stock, 1200);
  const m = await call('GET', `/insumos/${insumoId}/movimientos`, { token: admin });
  assert.equal(m.data.length, 3);
  assert.equal(m.data[0].cantidad, -50.5);
  assert.equal(m.data[0].stock_resultante, 1200);
  assert.equal(m.data[0].tipo, 'ajuste');
});
test('insumos: ajuste inválido (0, sin motivo) => 400; dejar stock negativo => 409 y no cambia nada', async () => {
  assert.equal((await call('POST', `/insumos/${insumoId}/ajuste`, { token: admin, body: { cantidad: 0, motivo: 'nada' } })).status, 400);
  assert.equal((await call('POST', `/insumos/${insumoId}/ajuste`, { token: admin, body: { cantidad: 5 } })).status, 400);
  const r = await call('POST', `/insumos/${insumoId}/ajuste`, { token: admin, body: { cantidad: -99999, motivo: 'Prueba' } });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /Stock insuficiente/);
  assert.equal((await call('GET', `/insumos/${insumoId}`, { token: admin })).data.stock, 1200);
  assert.equal((await call('GET', `/insumos/${insumoId}/movimientos`, { token: admin })).data.length, 3);
});
test('insumos: 10 ajustes simultáneos de -50 sobre 1200 no pierden ninguno', async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () =>
    call('POST', `/insumos/${insumoId}/ajuste`, { token: admin, body: { cantidad: -50, motivo: 'Concurrencia' } })));
  assert.ok(rs.every((r) => r.status === 200));
  assert.equal((await call('GET', `/insumos/${insumoId}`, { token: admin })).data.stock, 700);
});
test('insumos: permisos (mesero lee, no ajusta ni crea) y filtro bajo_minimo', async () => {
  assert.equal((await call('GET', '/insumos', { token: mesero })).status, 200);
  assert.equal((await call('POST', `/insumos/${insumoId}/ajuste`, { token: mesero, body: { cantidad: 1, motivo: 'intento' } })).status, 403);
  assert.equal((await call('POST', '/insumos', { token: mesero, body: { nombre: 'X Y', unidad: 'g' } })).status, 403);
  await call('POST', `/insumos/${insumo2Id}/ajuste`, { token: admin, body: { cantidad: -499, motivo: 'Bajar a 1' } });
  await call('PUT', `/insumos/${insumo2Id}`, { token: admin, body: { stock_minimo: 100 } });
  const bajo = await call('GET', '/insumos?bajo_minimo=true', { token: admin });
  assert.ok(bajo.data.some((i) => i.id === insumo2Id));
  assert.ok(!bajo.data.some((i) => i.id === insumoId));
});

// ---------- PRODUCTOS ----------
test('productos: validación (precio negativo, receta con insumo repetido y cantidad 0)', async () => {
  const { status, data } = await call('POST', '/productos', { token: admin, body: {
    nombre: 'Pan', precio: -1, receta: [{ insumo_id: insumoId, cantidad: 0 }, { insumo_id: insumoId, cantidad: 5 }] } });
  assert.equal(status, 400);
  assert.ok(data.details.length >= 2);
});
test('productos: receta con insumo inexistente => 400', async () => {
  const r = await call('POST', '/productos', { token: admin, body: { nombre: `Fantasma ${sfx}`, precio: 10, receta: [{ insumo_id: 999999, cantidad: 5 }] } });
  assert.equal(r.status, 400);
  assert.ok(r.data.details[0].mensaje.includes('999999'));
  const lista = await call('GET', `/productos?q=Fantasma ${sfx}`, { token: admin });
  assert.equal(lista.data.length, 0, 'no debe quedar un producto a medias');
});
test('productos: crear con receta y ver porciones disponibles', async () => {
  const c = await call('POST', '/productos', { token: admin, body: {
    nombre: `Pan dulce ${sfx}`, categoria: 'postre', precio: 12.5,
    receta: [{ insumo_id: insumoId, cantidad: 100 }, { insumo_id: insumo2Id, cantidad: 0.5 }] } });
  assert.equal(c.status, 201);
  productoId = c.data.id;
  assert.equal(c.data.precio, 12.5);
  assert.equal(c.data.receta.length, 2);
  // harina 700/100 = 7 ; azúcar 1/0.5 = 2  => el insumo más escaso manda
  assert.equal(c.data.porciones, 2);
  assert.equal((await call('POST', '/productos', { token: admin, body: { nombre: `Pan dulce ${sfx}`, precio: 1 } })).status, 409);
});
test('productos: producto sin receta => porciones null', async () => {
  const c = await call('POST', '/productos', { token: admin, body: { nombre: `Agua ${sfx}`, categoria: 'bebida', precio: 5 } });
  assert.equal(c.status, 201);
  assert.equal(c.data.porciones, null);
  assert.deepEqual(c.data.receta, []);
  await call('DELETE', `/productos/${c.data.id}`, { token: admin });
});
test('productos: actualizar reemplaza la receta completa', async () => {
  const u = await call('PUT', `/productos/${productoId}`, { token: admin, body: { precio: 15, receta: [{ insumo_id: insumoId, cantidad: 350 }] } });
  assert.equal(u.status, 200);
  assert.equal(u.data.precio, 15);
  assert.equal(u.data.receta.length, 1);
  assert.equal(u.data.porciones, 2);                 // 700/350
  const solo = await call('PUT', `/productos/${productoId}`, { token: admin, body: { nombre: `Pan dulce ${sfx} v2` } });
  assert.equal(solo.data.receta.length, 1, 'sin "receta" en el body no se toca');
});
test('productos: una receta inválida al actualizar no pierde la receta anterior', async () => {
  const r = await call('PUT', `/productos/${productoId}`, { token: admin, body: { receta: [{ insumo_id: 999999, cantidad: 1 }] } });
  assert.equal(r.status, 400);
  assert.equal((await call('GET', `/productos/${productoId}`, { token: admin })).data.receta.length, 1);
});
test('productos: listar/filtrar y permisos (mesero ve, no crea)', async () => {
  const l = await call('GET', '/productos?categoria=postre', { token: mesero });
  assert.equal(l.status, 200);
  assert.ok(l.data.every((p) => p.categoria === 'postre'));
  assert.ok(l.data.some((p) => p.id === productoId));
  assert.equal((await call('POST', '/productos', { token: mesero, body: { nombre: 'Pirata', precio: 1 } })).status, 403);
  const seed = await call('GET', '/productos?q=Hamburguesa', { token: admin });
  assert.equal(seed.data[0].categoria, 'platillo');
  assert.equal((await call('GET', '/productos/999999', { token: admin })).status, 404);
});
test('insumos: no se puede desactivar ni cambiar de unidad un insumo usado por un producto activo', async () => {
  const d = await call('DELETE', `/insumos/${insumoId}`, { token: admin });
  assert.equal(d.status, 409);
  assert.match(d.data.error, /Pan dulce/);
  assert.equal((await call('PUT', `/insumos/${insumoId}`, { token: admin, body: { unidad: 'ml' } })).status, 409);
});
test('productos: eliminar = desactivar; luego el insumo ya se puede desactivar', async () => {
  assert.equal((await call('DELETE', `/productos/${productoId}`, { token: admin })).status, 204);
  assert.equal((await call('GET', `/productos/${productoId}`, { token: admin })).data.activo, 0);
  const act = await call('GET', '/productos?activo=true', { token: admin });
  assert.ok(!act.data.some((p) => p.id === productoId));
  assert.equal((await call('DELETE', `/insumos/${insumoId}`, { token: admin })).status, 204);
  assert.equal((await call('DELETE', `/insumos/${insumo2Id}`, { token: admin })).status, 204);
});

// ---------- VALIDACIONES ----------
test('validación: nada en cero ni vacío (precio 0, nombres sin letras, cantidades 0)', async () => {
  const mal = async (path, body) => assert.equal((await call('POST', path, { token: admin, body })).status, 400, `${path} ${JSON.stringify(body)}`);
  await mal('/productos', { nombre: `Cero ${sfx}`, precio: 0 });                       // un producto no puede costar 0
  await mal('/productos', { nombre: '000', precio: 10 });                             // el nombre necesita letras
  await mal('/productos', { nombre: '   ', precio: 10 });
  await mal('/productos', { nombre: 0, precio: 0, categoria: 0, receta: 0 });          // todo en cero
  await mal('/insumos', { nombre: '123', unidad: 'g' });
  await mal('/insumos', { nombre: 0, unidad: 0, stock: 0, stock_minimo: 0 });
  await mal('/mesas', { numero: 0, capacidad: 0 });
  await mal('/users', { nombre: '000', email: 'cero@sabor.gt', password: 'Prueba123' });
  await mal('/users', { nombre: 0, email: 0, password: 0 });
  await mal('/productos', {});                                                          // cuerpo vacío
});
