import { useState } from 'react';
import { quetzales } from '../../lib/formato';
import { cx } from '../../components/ui';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const diaCorto = (f) => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1]}`;

// Escala redonda para el eje: 1, 2 o 5 por potencia de 10
const tope = (max) => {
  if (max <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= max);
};

export default function Grafica({ dias }) {
  const [activo, setActivo] = useState(null);
  const max = tope(Math.max(...dias.map((d) => d.total_ventas)));
  const cada = Math.ceil(dias.length / 7);         // unas 7 etiquetas como máximo
  const d = activo !== null ? dias[activo] : null;
  return (
    <div className="relative">
      <div className="flex h-56 gap-3">
        <div className="flex flex-col justify-between pb-6 text-right text-xs text-suave cifras" aria-hidden="true">
          <span>{quetzales(max).replace('.00', '')}</span><span>{quetzales(max / 2).replace('.00', '')}</span><span>Q 0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            <div className="border-t border-dashed border-linea" /><div className="border-t border-dashed border-linea" /><div className="border-t border-linea" />
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]" onMouseLeave={() => setActivo(null)}>
            {dias.map((x, i) => (
              <button key={x.fecha} type="button" className="group flex h-full min-w-0 flex-1 items-end focus:outline-none"
                onMouseEnter={() => setActivo(i)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)}
                aria-label={`${diaCorto(x.fecha)}: ${quetzales(x.total_ventas)}, ${x.num_pedidos} pedidos`}>
                <span className={activo === i ? 'w-full rounded-t-[4px] bg-primario-700' : 'w-full rounded-t-[4px] bg-primario-600'}
                  style={{ height: x.total_ventas ? `max(${(x.total_ventas / max) * 100}%, 3px)` : 0 }} />
              </button>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px] text-xs text-suave" aria-hidden="true">
            {dias.map((x, i) => (
              <span key={x.fecha} className="relative flex-1">
                {(i % cada === 0 || i === dias.length - 1) && (i === dias.length - 1 || dias.length - 1 - i >= cada / 2) &&
                  <span className={cx('absolute whitespace-nowrap', i === 0 ? 'left-0' : i === dias.length - 1 ? 'right-0' : 'left-1/2 hidden -translate-x-1/2 sm:block')}>{diaCorto(x.fecha)}</span>}
              </span>
            ))}
          </div>
          {d && (
            <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-tinta px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `clamp(4rem, ${((activo + 0.5) / dias.length) * 100}%, calc(100% - 4rem))` }}>
              <p className="font-medium">{diaCorto(d.fecha)}</p>
              <p className="cifras">{quetzales(d.total_ventas)}</p>
              <p className="text-white/70">{d.num_pedidos} {d.num_pedidos === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
