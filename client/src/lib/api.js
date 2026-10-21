const BASE = import.meta.env.VITE_API_URL ?? '/api';
const CLAVE = 'sabor.token';

export const token = {
  get: () => { try { return localStorage.getItem(CLAVE); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(CLAVE, t) : localStorage.removeItem(CLAVE); } catch { /* sin localStorage */ } },
};

export class ApiError extends Error {
  constructor(status, message, details = []) { super(message); this.status = status; this.details = details ?? []; }
}

let alExpirar = () => {};
export const onSesionExpirada = (fn) => { alExpirar = fn; };

const pedir = async (method, path, body) => {
  const t = token.get();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(t && { Authorization: `Bearer ${t}` }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa que la API esté encendida.');
  }
  if (res.status === 401 && t) alExpirar();
  return res;
};

const error = async (res) => {
  const data = await res.json().catch(() => ({}));
  return new ApiError(res.status, data.error ?? `Error ${res.status}`, data.details);
};

export const api = async (method, path, body) => {
  const res = await pedir(method, path, body);
  if (!res.ok) throw await error(res);
  return res.status === 204 ? null : res.json();
};
api.get = (p) => api('GET', p);
api.post = (p, b) => api('POST', p, b);
api.put = (p, b) => api('PUT', p, b);
api.patch = (p, b) => api('PATCH', p, b);
api.del = (p) => api('DELETE', p);

export const descargar = async (path) => {
  const res = await pedir('GET', path);
  if (!res.ok) throw await error(res);
  const nombre = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ?? 'archivo';
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const qs = (o) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null));
  return p.size ? `?${p}` : '';
};
