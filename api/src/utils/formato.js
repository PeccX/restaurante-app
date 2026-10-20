import { env } from '../config/env.js';

// Las fechas de la BD son instantes; para mostrarlas se corren a la zona del restaurante
const [, signo, hh, mm] = env.DB_TIMEZONE.match(/([+-])(\d{2}):(\d{2})/);
const OFFSET_MS = (signo === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm)) * 60_000;

// Date cuyos campos UTC son la hora local (sirve para Excel, que no maneja zonas)
export const horaLocal = (d) => new Date(new Date(d).getTime() + OFFSET_MS);
export const hoy = () => horaLocal(Date.now()).toISOString().slice(0, 10);

const dos = (n) => String(n).padStart(2, '0');
export const fmtDia = (iso) => iso.split('-').reverse().join('/');                        // 2026-10-20 -> 20/10/2026
export const fmtFechaHora = (d) => {
  const l = horaLocal(d);
  return `${dos(l.getUTCDate())}/${dos(l.getUTCMonth() + 1)}/${l.getUTCFullYear()} ${dos(l.getUTCHours())}:${dos(l.getUTCMinutes())}`;
};
export const quetzales = (n) => `Q ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const capitalizar = (s) => (s ? s[0].toUpperCase() + s.slice(1).replace('_', ' ') : '');
