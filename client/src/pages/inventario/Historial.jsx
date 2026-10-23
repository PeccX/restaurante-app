import { api } from '../../lib/api';
import { fechaHora } from '../../lib/formato';
import { cantidad } from '../../lib/insumos';
import { useDatos } from '../../lib/useDatos';
import { Aviso, Cargando, cx } from '../../components/ui';

const detalle = (m) => m.tipo === 'consumo' ? `Pedido #${m.pedido_id}`
  : m.tipo === 'devolucion' ? `Pedido #${m.pedido_id} cancelado o editado` : m.motivo;

export default function Historial({ insumo }) {
  const { datos: movs, error } = useDatos(() => api.get(`/insumos/${insumo.id}/movimientos?limit=100`), [insumo.id]);
  if (error) return <Aviso>{error.message}</Aviso>;
  if (!movs) return <Cargando />;
  if (!movs.length) return <p className="py-6 text-center text-sm text-suave">Todavía no tiene movimientos.</p>;
  return (
    <>
      <p className="mb-3 text-sm text-suave">Los últimos {movs.length} movimientos, del más reciente al más antiguo.</p>
      <ul className="-mx-2 max-h-[60vh] divide-y divide-linea overflow-y-auto">
        {movs.map((m) => (
          <li key={m.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 px-2 py-3 text-sm">
            <p className="min-w-0 truncate font-medium">{detalle(m)}</p>
            <p className={cx('text-right font-semibold cifras', m.cantidad > 0 ? 'text-exito-600' : 'text-peligro-600')}>
              {m.cantidad > 0 ? '+' : '−'}{cantidad(Math.abs(m.cantidad), insumo.unidad)}
            </p>
            <p className="min-w-0 truncate text-xs text-suave">{fechaHora(m.creado_en)}, {m.usuario}</p>
            <p className="text-right text-xs text-suave cifras">quedó {cantidad(m.stock_resultante, insumo.unidad)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
