import { forwardRef, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');

const BOTON = {
  primario: 'bg-primario-600 text-white hover:bg-primario-700 shadow-md shadow-primario-600/20',
  secundario: 'bg-white text-tinta border border-linea hover:border-primario-400 hover:text-primario-700',
  peligro: 'bg-peligro-600 text-white hover:bg-peligro-600/90',
  fantasma: 'text-primario-700 hover:bg-primario-50',
  fantasmaPeligro: 'text-peligro-600 hover:bg-peligro-50',
};
export const Boton = ({ variante = 'primario', cargando, className, children, ...p }) => (
  <button
    {...p}
    disabled={p.disabled || cargando}
    className={cx('inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed', BOTON[variante], className)}
  >
    {cargando && <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />}
    {children}
  </button>
);

export const Campo = ({ label, error, ayuda, id, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    {children}
    {error ? <p id={`${id}-error`} className="text-sm text-peligro-600">{error}</p>
      : ayuda && <p id={`${id}-ayuda`} className="text-sm text-suave">{ayuda}</p>}
  </div>
);

const ENTRADA = 'h-11 w-full rounded-xl border bg-white px-4 text-sm placeholder:text-suave/70 transition-shadow focus:outline-none focus:ring-4 focus:ring-primario-600/10';
const estado = (error) => (error ? 'border-peligro-600' : 'border-linea focus:border-primario-400');

export const Entrada = forwardRef(({ error, className, ...p }, ref) => (
  <input ref={ref} aria-invalid={Boolean(error)} aria-describedby={error ? `${p.id}-error` : undefined} className={cx(ENTRADA, estado(error), className)} {...p} />
));

export const Selector = forwardRef(({ error, className, children, ...p }, ref) => (
  <select ref={ref} aria-invalid={Boolean(error)} className={cx(ENTRADA, estado(error), 'pr-10', className)} {...p}>{children}</select>
));

const INSIGNIA = {
  primario: 'bg-primario-100 text-primario-700', exito: 'bg-exito-50 text-exito-600',
  aviso: 'bg-aviso-50 text-aviso-700', peligro: 'bg-peligro-50 text-peligro-600', neutro: 'bg-fondo text-suave border border-linea',
};
export const Insignia = ({ color = 'neutro', children }) => (
  <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', INSIGNIA[color])}>{children}</span>
);

export const Encabezado = ({ titulo, descripcion, children }) => (
  <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
    <div>
      <h1 className="titulo text-3xl sm:text-[2.5rem] leading-tight">{titulo}</h1>
      {descripcion && <p className="mt-1 text-sm text-suave max-w-prose">{descripcion}</p>}
    </div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </header>
);

export const Aviso = ({ tipo = 'error', children }) => children ? (
  <div role={tipo === 'error' ? 'alert' : 'status'} className={cx('rounded-xl px-4 py-3 text-sm',
    tipo === 'error' ? 'bg-peligro-50 text-peligro-600' : 'bg-aviso-50 text-aviso-700')}>
    {children}
  </div>
) : null;

// <dialog> nativo: Esc y foco atrapado sin librerías
export function Modal({ abierto, alCerrar, titulo, children, ancho = 'max-w-lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog ref={ref} onClose={alCerrar} onClick={(e) => e.target === ref.current && alCerrar()}
      className={cx('m-auto w-[calc(100%-2rem)] rounded-3xl bg-white p-0 text-tinta shadow-2xl backdrop:bg-tinta/40', ancho)}>
      {abierto && (
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 className="titulo text-2xl">{titulo}</h2>
            <button onClick={alCerrar} className="-m-2 rounded-full p-2 text-suave hover:bg-primario-50 hover:text-primario-700" aria-label="Cerrar">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const Confirmar = ({ abierto, titulo, mensaje, accion, variante = 'peligro', cargando, alConfirmar, alCerrar }) => (
  <Modal abierto={abierto} alCerrar={alCerrar} titulo={titulo} ancho="max-w-md">
    <p className="text-sm text-suave">{mensaje}</p>
    <div className="mt-8 flex justify-end gap-2">
      <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
      <Boton variante={variante} cargando={cargando} onClick={alConfirmar}>{accion}</Boton>
    </div>
  </Modal>
);

export const Cargando = ({ texto = 'Cargando…' }) => (
  <div className="flex items-center gap-3 py-16 justify-center text-sm text-suave" role="status">
    <span className="size-5 rounded-full border-2 border-primario-600 border-r-transparent animate-spin" aria-hidden="true" />{texto}
  </div>
);

export const Vacio = ({ titulo, children }) => (
  <div className="tarjeta px-6 py-14 text-center">
    <p className="titulo text-xl">{titulo}</p>
    {children && <div className="mt-2 text-sm text-suave">{children}</div>}
  </div>
);

export { cx };
