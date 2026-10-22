import { useState } from 'react';
import { PlatoDibujo } from '../../components/Platos';
import PaginaError from './PaginaError';

// Platos flotando como en el frame de mantenimiento
const FLOTANTES = [
  ['left-[4%] -top-6 size-28 sm:size-36', 'guacamol'], ['left-[14%] top-[30%] size-20 sm:size-28', 'tortillas'],
  ['left-[44%] top-[12%] size-24 sm:size-32', 'chirmol'], ['right-[22%] top-[22%] size-20 sm:size-28', 'frijoles'],
  ['right-[4%] top-[4%] size-24 sm:size-36', 'rellenitos'], ['-right-6 top-[40%] size-24 sm:size-32', 'pepian'],
];

export default function SinConexion({ alReintentar }) {
  const [probando, setProbando] = useState(false);
  const reintentar = async () => { setProbando(true); try { await alReintentar(); } finally { setProbando(false); } };
  return (
    <PaginaError titulo="No hay conexión con el servidor"
      ilustracion={FLOTANTES.map(([pos, p]) => (
        <svg key={p} viewBox="-20 -20 240 260" className={`pointer-events-none absolute hidden sm:block overflow-visible ${pos}`} aria-hidden="true">
          <PlatoDibujo cx={100} cy={100} r={88} platillo={p} />
        </svg>
      ))}
      acciones={
        <button onClick={reintentar} disabled={probando} className="inline-flex h-11 items-center gap-2 rounded-full bg-primario-600 px-6 text-white hover:bg-primario-700 disabled:opacity-60">
          {probando && <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />}
          {probando ? 'Intentando…' : 'Reintentar'}
        </button>
      }>
      No pudimos comunicarnos con el sistema. Revisa tu conexión a internet; si sigue igual, el servidor puede estar apagado.
    </PaginaError>
  );
}
