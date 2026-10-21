import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { quetzales } from '../../lib/formato';
import { useDatos } from '../../lib/useDatos';
import { Aviso, Cargando, Encabezado, Vacio, cx } from '../../components/ui';

const FILTROS = [['todas', 'Todas'], ['libre', 'Libres'], ['ocupada', 'Ocupadas']];

// pedidos sin pagar agrupados por mesa
const agrupar = (pedidos) => pedidos.reduce((m, p) => {
  const g = m[p.mesa_id] ??= { pedidos: 0, total: 0, cocina: 0, porCobrar: 0 };
  g.pedidos++; g.total += p.total;
  if (p.estado === 'entregado') g.porCobrar++; else g.cocina++;
  return m;
}, {});

export default function Mesas() {
  const [filtro, setFiltro] = useState('todas');
  const { datos, error } = useDatos(async () => {
    const [mesas, pedidos] = await Promise.all([api.get('/mesas?activo=true'), api.get('/pedidos?sin_pagar=true&limit=200')]);
    return { mesas, cuentas: agrupar(pedidos) };
  }, [], { cada: 15000 });

  const cuenta = useMemo(() => datos && {
    todas: datos.mesas.length,
    libre: datos.mesas.filter((m) => m.estado === 'libre').length,
    ocupada: datos.mesas.filter((m) => m.estado === 'ocupada').length,
  }, [datos]);

  if (!datos) return error ? <Aviso>{error.message}</Aviso> : <Cargando />;
  const visibles = datos.mesas.filter((m) => filtro === 'todas' || m.estado === filtro);

  return (
    <>
      <Encabezado titulo="Mesas" descripcion="Toca una mesa libre para tomar su pedido, o una ocupada para ver lo que lleva." />
      <div role="group" aria-label="Filtrar mesas" className="mb-8 flex flex-wrap gap-3">
        {FILTROS.map(([v, t]) => (
          <button key={v} aria-pressed={filtro === v} onClick={() => setFiltro(v)}
            className={cx('rounded-full border px-5 h-10 text-sm font-medium transition-colors',
              filtro === v ? 'border-primario-600 bg-primario-600 text-white' : 'border-primario-600 text-primario-700 hover:bg-primario-50')}>
            {t} <span className={cx('ml-1 cifras', filtro === v ? 'text-white/80' : 'text-suave')}>{cuenta[v]}</span>
          </button>
        ))}
      </div>
      <Aviso>{error && 'No se pudo actualizar. Se muestran los últimos datos.'}</Aviso>

      {!visibles.length ? (
        <Vacio titulo={filtro === 'libre' ? 'No hay mesas libres ahora.' : filtro === 'ocupada' ? 'Ninguna mesa está ocupada.' : 'Todavía no hay mesas.'}>
          {filtro === 'todas' && 'Pide a administración que registre las mesas del restaurante.'}
        </Vacio>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
          {visibles.map((m) => <li key={m.id}><TarjetaMesa mesa={m} cuenta={datos.cuentas[m.id]} /></li>)}
        </ul>
      )}
    </>
  );
}

function TarjetaMesa({ mesa, cuenta }) {
  const ocupada = mesa.estado === 'ocupada';
  const destino = ocupada ? `/mesas/${mesa.id}` : `/mesas/${mesa.id}/nuevo`;
  return (
    <Link to={destino}
      className={cx('group flex h-full flex-col rounded-[24px] p-5 sm:p-6 transition-transform hover:-translate-y-0.5',
        ocupada ? 'bg-primario-600/85 text-white shadow-lg shadow-primario-600/25' : 'tarjeta')}>
      <div className="flex items-start justify-between">
        <span className={cx('text-sm font-medium', ocupada ? 'text-white/80' : 'text-suave')}>Mesa</span>
        <span className={cx('flex items-center gap-1 text-xs font-medium', ocupada ? 'text-white/80' : 'text-suave')}>
          <Users className="size-3.5" aria-hidden="true" />{mesa.capacidad}<span className="sr-only"> personas</span>
        </span>
      </div>
      <span className="titulo text-5xl sm:text-6xl leading-none mt-1 cifras">{mesa.numero}</span>
      <div className="mt-auto pt-6">
        {ocupada ? (
          <div className="text-sm">
            <p className="font-semibold cifras">{cuenta ? quetzales(cuenta.total) : 'Ocupada'}</p>
            {cuenta && (
              <p className="text-white/85">
                {cuenta.porCobrar ? `${cuenta.porCobrar} por cobrar` : `${cuenta.cocina} en curso`}
                {cuenta.porCobrar > 0 && cuenta.cocina > 0 && `, ${cuenta.cocina} en curso`}
              </p>
            )}
          </div>
        ) : (
          <span className="flex items-center justify-between text-sm font-medium text-exito-600">
            Libre
            <span className="grid size-8 place-items-center rounded-full bg-primario-600 text-white group-hover:bg-primario-700" aria-hidden="true"><Plus className="size-4" /></span>
          </span>
        )}
      </div>
    </Link>
  );
}
