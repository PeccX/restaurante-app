import { useEffect, useState } from 'react';
import { ChefHat, Clock, StickyNote } from 'lucide-react';
import { api } from '../../lib/api';
import { hora } from '../../lib/formato';
import { useDatos } from '../../lib/useDatos';
import { useToast } from '../../components/Toast';
import { Aviso, Boton, Cargando, Encabezado, cx } from '../../components/ui';

const COLUMNAS = [
  { estado: 'pendiente', titulo: 'Por preparar', siguiente: 'en_preparacion', accion: 'Empezar', ok: 'en preparación' },
  { estado: 'en_preparacion', titulo: 'En preparación', siguiente: 'entregado', accion: 'Listo', ok: 'entregado' },
];

const minutos = (d, ahora) => Math.max(0, Math.floor((ahora - new Date(d)) / 60000));
// a los 15 min se avisa, a los 25 ya va tarde
const urgencia = (min) => (min >= 25 ? 'tarde' : min >= 15 ? 'aviso' : 'normal');

export default function Cocina() {
  const avisar = useToast();
  const [ocupado, setOcupado] = useState(null);
  const [ahora, setAhora] = useState(Date.now());
  const { datos, error, recargar, setDatos } = useDatos(() => api.get('/pedidos?abiertos=true&con_items=true&limit=200'), [], { cada: 8000 });

  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 30000); return () => clearInterval(t); }, []);

  const avanzar = async (p, col) => {
    setOcupado(p.id);
    try {
      await api.patch(`/pedidos/${p.id}/estado`, { estado: col.siguiente });
      // se mueve de columna sin esperar la siguiente recarga
      setDatos((lista) => col.siguiente === 'entregado' ? lista.filter((x) => x.id !== p.id) : lista.map((x) => (x.id === p.id ? { ...x, estado: col.siguiente } : x)));
      avisar(`Mesa ${p.mesa}: pedido #${p.id} ${col.ok}.`);
    } catch (e) {
      avisar(e.status === 409 ? `El pedido #${p.id} ya cambió de estado (lo cancelaron o lo movió otra persona).` : e.message, 'error');
      recargar();
    } finally { setOcupado(null); }
  };

  if (!datos) return error ? <Aviso>{error.message}</Aviso> : <Cargando />;
  // el más viejo primero: es el que lleva más tiempo esperando
  const de = (estado) => datos.filter((p) => p.estado === estado).sort((a, b) => a.id - b.id);

  return (
    <>
      <Encabezado titulo="Cocina" descripcion="El pedido más antiguo aparece primero." />
      <Aviso>{error && 'No se pudo actualizar. Se muestran los últimos pedidos.'}</Aviso>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 items-start">
        {COLUMNAS.map((col) => {
          const lista = de(col.estado);
          return (
            <section key={col.estado} aria-labelledby={`col-${col.estado}`} className="rounded-[24px] bg-white/60 p-4 sm:p-5">
              <h2 id={`col-${col.estado}`} className="mb-4 flex items-center justify-between px-1">
                <span className="titulo text-[23px]">{col.titulo}</span>
                <span className={cx('grid min-w-8 h-8 place-items-center rounded-full px-2 text-sm font-semibold cifras',
                  lista.length ? 'bg-primario-600 text-white' : 'bg-linea text-suave')}>{lista.length}</span>
              </h2>
              {!lista.length ? (
                <p className="flex flex-col items-center gap-2 py-12 text-sm text-suave">
                  <ChefHat className="size-8 text-primario-400" aria-hidden="true" />
                  {col.estado === 'pendiente' ? 'No hay pedidos nuevos.' : 'No hay nada en preparación.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {lista.map((p) => <li key={p.id}><Comanda p={p} col={col} ahora={ahora} ocupado={ocupado === p.id} alAvanzar={() => avanzar(p, col)} /></li>)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Comanda({ p, col, ahora, ocupado, alAvanzar }) {
  const min = minutos(p.creado_en, ahora);
  const u = urgencia(min);
  // misma cantidad de un producto aunque sea de comensales distintos: a cocina le basta el total
  const items = Object.values(p.items.reduce((m, i) => {
    (m[i.producto_id] ??= { ...i, cantidad: 0 }).cantidad += i.cantidad;
    return m;
  }, {}));
  return (
    <article className={cx('tarjeta p-5 border-l-[6px]', { normal: 'border-l-primario-400', aviso: 'border-l-aviso-700', tarde: 'border-l-peligro-600' }[u])}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="titulo text-3xl leading-none">Mesa {p.mesa}</p>
          <p className="mt-1 text-xs text-suave">Pedido #{p.id}, {p.mesero}</p>
        </div>
        <span className={cx('flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium cifras',
          { normal: 'bg-fondo text-suave', aviso: 'bg-aviso-50 text-aviso-700', tarde: 'bg-peligro-50 text-peligro-600' }[u])}
          title={`Entró a las ${hora(p.creado_en)}`}>
          <Clock className="size-4" aria-hidden="true" />{min} min
        </span>
      </header>
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.producto_id} className="flex items-baseline gap-3 text-[15px]">
            <span className="w-9 shrink-0 text-right text-lg font-semibold text-primario-600 cifras">{i.cantidad}×</span>
            <span className="font-medium">{i.producto}</span>
          </li>
        ))}
      </ul>
      {p.notas && (
        <p className="mt-4 flex gap-2 rounded-2xl bg-aviso-50 px-4 py-3 text-sm text-aviso-700">
          <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{p.notas}
        </p>
      )}
      <Boton className="mt-5 w-full h-11" cargando={ocupado} onClick={alAvanzar}>{col.accion}</Boton>
    </article>
  );
}
