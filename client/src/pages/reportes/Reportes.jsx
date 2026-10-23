import { useState } from 'react';
import { Link } from 'react-router';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { api, descargar, qs } from '../../lib/api';
import { fechaHora, quetzales } from '../../lib/formato';
import { METODOS } from '../../lib/estados';
import { cantidad } from '../../lib/insumos';
import { useDatos } from '../../lib/useDatos';
import { useToast } from '../../components/Toast';
import { Aviso, Boton, Cargando, Encabezado } from '../../components/ui';
import Rango, { RAPIDOS, errorDeRango } from './Rango';
import Grafica, { diaCorto } from './Grafica';

const Seccion = ({ titulo, children, className }) => (
  <section className={`tarjeta p-5 ${className ?? ''}`}>
    <h2 className="titulo mb-4 text-xl">{titulo}</h2>
    {children}
  </section>
);
const Dato = ({ titulo, valor, detalle }) => (
  <div className="tarjeta p-5">
    <p className="text-sm text-suave">{titulo}</p>
    <p className="titulo mt-1 whitespace-nowrap text-2xl cifras sm:text-3xl">{valor}</p>
    {detalle && <p className="mt-1 text-xs text-suave">{detalle}</p>}
  </div>
);

export default function Reportes() {
  const avisar = useToast();
  const [rango, setRango] = useState(() => { const [desde, hasta] = RAPIDOS[2][1](); return { desde, hasta }; });
  const [bajando, setBajando] = useState(null);
  const valido = !errorDeRango(rango);
  // con un rango inválido se queda mostrando el último que sí sirvió
  const [pedido, setPedido] = useState(rango);
  if (valido && (pedido.desde !== rango.desde || pedido.hasta !== rango.hasta)) setPedido(rango);
  const { datos, error } = useDatos(() => api.get(`/reportes/ventas${qs(pedido)}`), [pedido.desde, pedido.hasta]);
  const vigente = datos && datos.desde === pedido.desde && datos.hasta === pedido.hasta;

  const bajar = async (tipo) => {
    setBajando(tipo);
    try { await descargar(`/reportes/ventas/${tipo}${qs(pedido)}`); }
    catch (e) { avisar(e.message, 'error'); }
    finally { setBajando(null); }
  };

  const r = datos?.resumen;
  const maxProducto = Math.max(1, ...(datos?.productos ?? []).map((p) => p.unidades));
  const periodo = pedido.desde === pedido.hasta ? diaCorto(pedido.desde) : `${diaCorto(pedido.desde)} al ${diaCorto(pedido.hasta)}`;

  return (
    <>
      <Encabezado titulo="Reportes" descripcion="Ventas cobradas en el periodo que elijas. Un pedido cuenta el día en que se pagó.">
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => bajar('excel')} cargando={bajando === 'excel'} disabled={!valido || Boolean(bajando)}>
            <FileSpreadsheet className="size-4" aria-hidden="true" />Excel
          </Boton>
          <Boton variante="secundario" onClick={() => bajar('pdf')} cargando={bajando === 'pdf'} disabled={!valido || Boolean(bajando)}>
            <FileText className="size-4" aria-hidden="true" />PDF
          </Boton>
        </div>
      </Encabezado>
      <Rango valor={rango} alCambiar={setRango} />

      <Aviso>{error?.message}</Aviso>
      {!datos ? <Cargando /> : (
        <div className={vigente ? '' : 'opacity-60 transition-opacity'}>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Dato titulo="Total vendido" valor={quetzales(r.total_ventas)} detalle={periodo} />
            <Dato titulo="Pedidos cobrados" valor={r.num_pedidos} />
            <Dato titulo="Ticket promedio" valor={quetzales(r.ticket_promedio)} detalle="Total entre pedidos" />
            <Dato titulo="Comensales" valor={r.comensales} />
          </div>

          <Seccion titulo="Ventas por día" className="mb-6">
            {r.num_pedidos ? <Grafica dias={datos.ventas_por_dia} /> : <p className="py-10 text-center text-sm text-suave">No hubo ventas en este periodo.</p>}
          </Seccion>

          <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Seccion titulo="Productos más vendidos">
              {!datos.productos.length ? <p className="text-sm text-suave">Sin ventas.</p> : (
                <ul className="flex flex-col gap-3">
                  {datos.productos.map((p) => (
                    <li key={p.producto} className="text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate font-medium">{p.producto}</p>
                        <p className="shrink-0 cifras"><span className="text-suave">{p.unidades} u</span><span className="ml-3 font-semibold">{quetzales(p.ingresos)}</span></p>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-fondo" aria-hidden="true">
                        <div className="h-full rounded-full bg-primario-400" style={{ width: `${(p.unidades / maxProducto) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
            <div className="flex flex-col gap-6">
              <Seccion titulo="Métodos de pago">
                {!datos.metodos_pago.length ? <p className="text-sm text-suave">Sin ventas.</p> : (
                  <ul className="flex flex-col gap-3 text-sm">
                    {datos.metodos_pago.map((m) => (
                      <li key={m.metodo_pago} className="flex items-baseline justify-between gap-3">
                        <span>{METODOS[m.metodo_pago]} <span className="text-xs text-suave">{m.num_pedidos} {m.num_pedidos === 1 ? 'pedido' : 'pedidos'}</span></span>
                        <span className="cifras"><span className="font-semibold">{quetzales(m.total)}</span>
                          <span className="ml-2 inline-block w-10 text-right text-xs text-suave">{Math.round((m.total / r.total_ventas) * 100)}%</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Seccion>
              {datos.insumos_bajo_minimo.length > 0 && (
                <Seccion titulo="Por acabarse">
                  <ul className="flex flex-col gap-2 text-sm">
                    {datos.insumos_bajo_minimo.map((i) => (
                      <li key={i.nombre} className="flex justify-between gap-3"><span>{i.nombre}</span>
                        <span className="cifras text-aviso-700">{cantidad(i.stock, i.unidad)}</span></li>
                    ))}
                  </ul>
                  <Link to="/inventario" className="mt-3 inline-block text-sm font-medium text-primario-700 hover:underline">Ir a inventario</Link>
                </Seccion>
              )}
            </div>
          </div>

          <Seccion titulo="Pedidos cobrados">
            {!datos.pedidos.length ? <p className="text-sm text-suave">Ninguno en este periodo.</p> : (
              <>
              <ul className="-mx-5 divide-y divide-linea border-t border-linea sm:hidden">
                {datos.pedidos.map((p) => (
                  <li key={p.id} className="grid grid-cols-[1fr_auto] gap-x-3 px-5 py-3 text-sm">
                    <Link to={`/pedidos/${p.id}`} className="font-medium text-primario-700">#{p.id} <span className="font-normal text-tinta">mesa {p.mesa}</span></Link>
                    <span className="text-right font-semibold cifras">{quetzales(p.total)}</span>
                    <span className="text-xs text-suave cifras">{fechaHora(p.pagado_en)}, {p.mesero}</span>
                    <span className="text-right text-xs text-suave">{METODOS[p.metodo_pago]}</span>
                  </li>
                ))}
              </ul>
              <div className="-mx-5 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead className="border-y border-linea bg-primario-50/60 text-left text-suave">
                    <tr><th className="px-5 py-3 font-medium">Pedido</th><th className="px-3 py-3 font-medium">Cobrado</th><th className="px-3 py-3 font-medium">Mesa</th>
                      <th className="px-3 py-3 font-medium">Mesero</th><th className="px-3 py-3 font-medium">Pago</th><th className="px-5 py-3 text-right font-medium">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {datos.pedidos.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-2.5"><Link to={`/pedidos/${p.id}`} className="font-medium text-primario-700 hover:underline">#{p.id}</Link></td>
                        <td className="px-3 py-2.5 cifras">{fechaHora(p.pagado_en)}</td>
                        <td className="px-3 py-2.5 cifras">{p.mesa}</td>
                        <td className="px-3 py-2.5">{p.mesero}</td>
                        <td className="px-3 py-2.5">{METODOS[p.metodo_pago]}</td>
                        <td className="px-5 py-2.5 text-right font-semibold cifras">{quetzales(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Seccion>
        </div>
      )}
    </>
  );
}
