import { cx } from '../../components/ui';

const DIA = 86_400_000;
const dos = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const hoy = () => iso(new Date());
const menos = (dias) => iso(new Date(Date.now() - dias * DIA));
export const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA) + 1;

export const RAPIDOS = [
  ['Hoy', () => [hoy(), hoy()]],
  ['7 días', () => [menos(6), hoy()]],
  ['30 días', () => [menos(29), hoy()]],
  ['Este mes', () => [`${hoy().slice(0, 8)}01`, hoy()]],
];

// Mismas reglas que rangoQuery en la API, más no pedir fechas futuras
export const errorDeRango = ({ desde, hasta }) => {
  if (!desde || !hasta) return 'Elige las dos fechas';
  if (desde > hasta) return 'La fecha inicial va antes que la final';
  if (hasta > hoy()) return 'No hay ventas en fechas futuras';
  if (dias(desde, hasta) > 366) return 'El rango no puede pasar de 366 días';
  return null;
};

export default function Rango({ valor, alCambiar }) {
  const error = errorDeRango(valor);
  const campo = (k, label) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-suave">{label}
      <input type="date" value={valor[k]} max={hoy()} onChange={(e) => alCambiar({ ...valor, [k]: e.target.value })} aria-invalid={Boolean(error)}
        className={cx('h-10 rounded-xl border bg-white px-3 text-sm text-tinta focus:outline-none focus:ring-4 focus:ring-primario-600/10',
          error ? 'border-peligro-600' : 'border-linea focus:border-primario-400')} />
    </label>
  );
  return (
    <div className="tarjeta mb-6 flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
      <div role="group" aria-label="Periodo" className="flex flex-wrap gap-1.5">
        {RAPIDOS.map(([t, f]) => {
          const [d, h] = f();
          const activo = valor.desde === d && valor.hasta === h;
          return (
            <button key={t} type="button" aria-pressed={activo} onClick={() => alCambiar({ desde: d, hasta: h })}
              className={cx('h-9 rounded-full border px-4 text-sm font-medium',
                activo ? 'border-primario-600 bg-primario-600 text-white' : 'border-linea bg-white text-suave hover:border-primario-400 hover:text-primario-700')}>{t}</button>
          );
        })}
      </div>
      <div>
        <div className="grid grid-cols-2 gap-3 sm:flex">{campo('desde', 'Desde')}{campo('hasta', 'Hasta')}</div>
        {error && <p role="alert" className="mt-1.5 text-sm text-peligro-600">{error}</p>}
      </div>
    </div>
  );
}
