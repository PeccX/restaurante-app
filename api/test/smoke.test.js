// Requiere la API corriendo y los datos de ejemplo
//   npm test                      (usa http://localhost:3000/api)
//   API_URL=http://IP-EC2/api npm test
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL ?? 'http://localhost:3000/api';
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json().catch(() => null) };
};

const email = `prueba${Date.now()}@sabor.gt`;
let admin, adminId, newId, meseroToken;

test('health: API y BD responden', async () => {
  const { status, data } = await call('GET', '/health');
  assert.equal(status, 200);
  assert.equal(data.db, 'ok');
});

test('login admin correcto devuelve token y usuario sin hash', async () => {
  const { status, data } = await call('POST', '/auth/login', { body: { email: 'admin@sabor.gt', password: 'Admin123!' } });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.user.rol, 'admin');
  assert.equal(data.user.password_hash, undefined);
  admin = data.token; adminId = data.user.id;
});

test('login con contraseña incorrecta => 401', async () => {
  const { status } = await call('POST', '/auth/login', { body: { email: 'admin@sabor.gt', password: 'incorrecta1' } });
  assert.equal(status, 401);
});

test('login con datos inválidos => 400 con detalle por campo', async () => {
  const { status, data } = await call('POST', '/auth/login', { body: { email: 'no-es-correo' } });
  assert.equal(status, 400);
  assert.ok(data.details.some((d) => d.campo === 'email'));
  assert.ok(data.details.some((d) => d.campo === 'password'));
});

test('/auth/me exige token y devuelve el usuario', async () => {
  assert.equal((await call('GET', '/auth/me')).status, 401);
  assert.equal((await call('GET', '/auth/me', { token: 'basura' })).status, 401);
  const { status, data } = await call('GET', '/auth/me', { token: admin });
  assert.equal(status, 200);
  assert.equal(data.email, 'admin@sabor.gt');
});

test('listar usuarios (admin) no expone password_hash', async () => {
  const { status, data } = await call('GET', '/users', { token: admin });
  assert.equal(status, 200);
  assert.ok(data.length >= 2);
  assert.ok(data.every((u) => u.password_hash === undefined));
});

test('crear usuario inválido => 400 con varios errores', async () => {
  const { status, data } = await call('POST', '/users', { token: admin, body: { nombre: 'A', email: 'x', password: '123', rol: 'dueño', extra: 1 } });
  assert.equal(status, 400);
  assert.ok(data.details.length >= 4);
});

test('crear usuario válido => 201 (rol mesero por defecto)', async () => {
  const { status, data } = await call('POST', '/users', { token: admin, body: { nombre: 'Prueba Auto', email: email.toUpperCase(), password: 'Prueba123' } });
  assert.equal(status, 201);
  assert.equal(data.email, email);          // se normaliza a minúsculas
  assert.equal(data.rol, 'mesero');
  assert.equal(data.password_hash, undefined);
  newId = data.id;
});

test('correo duplicado => 409', async () => {
  const { status } = await call('POST', '/users', { token: admin, body: { nombre: 'Otro', email, password: 'Prueba123' } });
  assert.equal(status, 409);
});

test('mesero puede entrar pero NO administrar usuarios => 403', async () => {
  const login = await call('POST', '/auth/login', { body: { email, password: 'Prueba123' } });
  assert.equal(login.status, 200);
  meseroToken = login.data.token;
  assert.equal((await call('GET', '/users', { token: meseroToken })).status, 403);
});

test('actualizar: id inválido, cuerpo vacío y cambio válido', async () => {
  assert.equal((await call('PUT', '/users/abc', { token: admin, body: { nombre: 'X Y' } })).status, 400);
  assert.equal((await call('PUT', `/users/${newId}`, { token: admin, body: {} })).status, 400);
  const { status, data } = await call('PUT', `/users/${newId}`, { token: admin, body: { nombre: 'Prueba Editada', rol: 'cocina' } });
  assert.equal(status, 200);
  assert.equal(data.nombre, 'Prueba Editada');
  assert.equal(data.rol, 'cocina');
});

test('usuario inexistente => 404', async () => {
  assert.equal((await call('GET', '/users/999999', { token: admin })).status, 404);
});

test('el admin no puede eliminarse a sí mismo => 400', async () => {
  assert.equal((await call('DELETE', `/users/${adminId}`, { token: admin })).status, 400);
});

test('eliminar = desactivar: 204 y luego el login da 403 y el token viejo deja de servir', async () => {
  assert.equal((await call('DELETE', `/users/${newId}`, { token: admin })).status, 204);
  assert.equal((await call('POST', '/auth/login', { body: { email, password: 'Prueba123' } })).status, 403);
  assert.equal((await call('GET', '/auth/me', { token: meseroToken })).status, 401);
});

test('ruta inexistente => 404 en JSON', async () => {
  const { status, data } = await call('GET', '/no-existe', { token: admin });
  assert.equal(status, 404);
  assert.ok(data.error);
});
