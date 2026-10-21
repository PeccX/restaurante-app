import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Banknote, Check, CreditCard, FileDown, Landmark } from 'lucide-react';
import { api, descargar } from '../../lib/api';
import { fechaHora, quetzales } from '../../lib/formato';
import { METODOS, estadoDe } from '../../lib/estados';
import { useDatos } from '../../lib/useDatos';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { Plato } from '../../components/Plato';
import { Aviso, Boton, Cargando, Insignia, Modal, cx } from '../../components/ui';

const PASOS = [['pendiente', 'Pendiente'], ['en_preparacion', 'En preparación'], ['entregado', 'Entregado'], ['pagado', 'Pagado']];
const ICONO_PAGO = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Landmark };

export default function PedidoDetalle() {
  const { pedidoId } = useParams();
  const { user } = useAuth();
  const avisar = useToast();
  const navigate = useNavigate();
  const [modo, setModo] = useState('consumo');
  const [dialogo, setDialogo] = useState(null);              // 'cancelar' | 'cobrar'
  const [ocupado, setOcupado] = useState(null);
  const { datos, error, recargar } = useDatos(async () => {
    const pedido = await api.get(`/pedidos/${pedidoId}`);
    const cuenta = pedido.estado === 'cancelado' ? null : await api.get(`/pedidos/${pedidoId}/cuenta?modo=${modo}`);
    return { pedido, cuenta };
  }, [pedidoId, modo], { cada: 15000 });

  if (!datos) return error ? <Aviso>{error.status === 404 ? 'Ese pedido no existe.' : error.message}</Aviso> : <Cargando />;
  const { pedido: p, cuenta } = datos;
  const atiende = ['admin', 'mesero'].includes(user.rol);
  const paso = p.pagado ? 3 : PASOS.findIndex(([k]) => k === p.estado);
  const e = estadoDe(p);

  const accion = async (nombre, fn, ok) => {
    setOcupado(nombre);
    try { await fn(); avisar(ok); setDialogo(null); await recargar(); }
    catch (err) { avisar(err.message, 'error'); }
    finally { setOcupado(null); }
  };
  const pdf = () => accion('pdf', () => descargar(`/reportes/cuenta/${p.id}/pdf?modo=${modo}`), 'Se descargó la cuenta.');

  const grupos = [...Array.from({ length: p.num_comensales }, (_, k) => k + 1), null]
    .map((c) => ({ c, items: p.items.filter((i) => i.comensal === c) })).filter((g) => g.items.length);

  return (
    <>
      <Link to={`/mesas/${p.mesa_id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primario-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />Mesa {p.mesa}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="titulo text-3xl sm:text-[2.5rem] leading-tight">Pedido #{p.id}</h1>
            <Insignia color={e.color}>{e.texto}</Insignia>
          </div>
          <p className="mt-1 text-sm text-suave">Mesa {p.mesa}, tomado por {p.mesero} el {fechaHora(p.creado_en)}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {atiende && p.estado === 'pendiente' && <Boton variante="secundario" onClick={() => navigate(`/pedidos/${p.id}/editar`)}>Editar</Boton>}
          {['pendiente', 'en_preparacion'].includes(p.estado) && user.rol !== 'cocina' && <Boton variante="secundario" className="text-peligro-600 hover:text-peligro-600 hover:border-peligro-600" onClick={() => setDialogo('cancelar')}>Cancelar pedido</Boton>}
          {p.estado === 'en_preparacion' && <Boton cargando={ocupado === 'entregar'} onClick={() => accion('entregar', () => api.patch(`/pedidos/${p.id}/estado`, { estado: 'entregado' }), 'Pedido marcado como entregado.')}>Marcar entregado</Boton>}
          {atiende && p.estado === 'entregado' && !p.pagado && <Boton onClick={() => setDialogo('cobrar')}>Cobrar</Boton>}
        </div>
      </header>

      {p.estado === 'cancelado' ? (
        <div className="mb-6"><Aviso tipo="info">Este pedido se canceló y sus insumos regresaron al inventario.</Aviso></div>
      ) : (
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Avance del pedido">
          {PASOS.map(([k, t], i) => (
            <li key={k} aria-current={i === paso ? 'step' : undefined} className="flex flex-col gap-2">
              <span className={cx('h-1.5 rounded-full', i <= paso ? 'bg-primario-600' : 'bg-linea')} />
              <span className={cx('flex items-center gap-1 text-xs sm:text-sm', i <= paso ? 'font-medium text-tinta' : 'text-suave')}>
                {i < paso && <Check className="size-3.5 text-primario-600" aria-hidden="true" />}{t}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <section className="tarjeta p-6" aria-labelledby="t-consumo">
          <h2 id="t-consumo" className="titulo text-[23px] mb-5">Consumo</h2>
          <div className="flex flex-col gap-5">
            {grupos.map(({ c, items }) => (
              <div key={c ?? 'c'}>
                <p className="mb-2 text-xs font-medium text-suave">{c ? `Comensal ${c}` : 'Compartido'}</p>
                <ul className="flex flex-col gap-2.5">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 rounded-full bg-primario-50 py-2 pl-2 pr-5">
                      <Plato categoria={i.categoria} tam="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{i.producto}</span>
                      <span className="text-sm text-suave cifras"><span className="text-primario-600">×</span>{i.cantidad}</span>
                      <span className="w-20 sm:w-24 shrink-0 text-right text-sm cifras">{quetzales(i.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {p.notas && <p className="mt-5 rounded-2xl bg-fondo px-4 py-3 text-sm"><span className="font-medium">Notas:</span> {p.notas}</p>}
          <div className="mt-6 flex items-baseline justify-between border-t border-linea pt-4">
            <span className="text-sm text-suave">Total</span>
            <span className="titulo text-2xl cifras">{quetzales(p.total)}</span>
          </div>
          {p.pagado ? <p className="mt-2 text-right text-sm text-exito-600">Pagado con {METODOS[p.metodo_pago].toLowerCase()} el {fechaHora(p.pagado_en)}</p> : null}
        </section>

        {cuenta && (
          <section className="tarjeta p-6" aria-labelledby="t-cuenta">
            <h2 id="t-cuenta" className="titulo text-[23px]">Cuenta dividida</h2>
            <div role="group" aria-label="Forma de dividir" className="mt-4 inline-flex rounded-full border border-linea p-1">
              {[['consumo', 'Por consumo'], ['iguales', 'Partes iguales']].map(([k, t]) => (
                <button key={k} aria-pressed={modo === k} onClick={() => setModo(k)}
                  className={cx('rounded-full px-4 h-8 text-sm font-medium', modo === k ? 'bg-primario-600 text-white' : 'text-suave hover:text-primario-700')}>{t}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-suave">
              {modo === 'consumo' ? 'Cada quien paga lo suyo más su parte de lo compartido.' : 'El total se divide entre todos; los centavos que sobran van al último.'}
            </p>
            <ul className="mt-4 flex flex-col divide-y divide-linea">
              {cuenta.cuentas.map((c) => (
                <li key={c.comensal} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">Comensal {c.comensal}</p>
                    {modo === 'consumo' && <p className="text-xs text-suave cifras">{quetzales(c.propio)} + {quetzales(c.compartido)} compartido</p>}
                  </div>
                  <span className="font-semibold cifras">{quetzales(c.total_a_pagar)}</span>
                </li>
              ))}
            </ul>
            {user.rol !== 'cocina' && (
              <Boton variante="secundario" className="mt-4 w-full" cargando={ocupado === 'pdf'} onClick={pdf}>
                <FileDown className="size-4" aria-hidden="true" />Descargar cuenta en PDF
              </Boton>
            )}
          </section>
        )}
      </div>

      <Cancelar abierto={dialogo === 'cancelar'} cargando={ocupado === 'cancelar'} alCerrar={() => setDialogo(null)}
        alConfirmar={(motivo) => accion('cancelar', () => api.patch(`/pedidos/${p.id}/estado`, { estado: 'cancelado', ...(motivo && { motivo }) }), 'Pedido cancelado. Los insumos regresaron al inventario.')} />
      <Cobrar abierto={dialogo === 'cobrar'} total={p.total} cargando={ocupado === 'cobrar'} alCerrar={() => setDialogo(null)}
        alConfirmar={(metodo_pago) => accion('cobrar', () => api.post(`/pedidos/${p.id}/pago`, { metodo_pago }), `Cobrado ${quetzales(p.total)}.`)} />
    </>
  );
}

function Cancelar({ abierto, cargando, alCerrar, alConfirmar }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="¿Cancelar este pedido?" ancho="max-w-md">
      <p className="text-sm text-suave">Los insumos que ya se descontaron regresan al inventario. Esto no se puede deshacer.</p>
      <label htmlFor="motivo" className="mt-5 mb-1.5 block text-sm font-medium">Motivo <span className="font-normal text-suave">(opcional)</span></label>
      <input id="motivo" maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. el cliente se retiró"
        className="h-11 w-full rounded-xl border border-linea px-4 text-sm focus:outline-none focus:ring-4 focus:ring-primario-600/10 focus:border-primario-400" />
      <div className="mt-8 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar}>Volver</Boton>
        <Boton variante="peligro" cargando={cargando} onClick={() => alConfirmar(motivo.trim())}>Cancelar pedido</Boton>
      </div>
    </Modal>
  );
}

function Cobrar({ abierto, total, cargando, alCerrar, alConfirmar }) {
  const [metodo, setMetodo] = useState('efectivo');
  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Cobrar la cuenta" ancho="max-w-md">
      <p className="text-sm text-suave">Total a cobrar</p>
      <p className="titulo text-4xl cifras">{quetzales(total)}</p>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium">Método de pago</legend>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(METODOS).map(([k, t]) => {
            const Icono = ICONO_PAGO[k];
            return (
              <label key={k} className={cx('flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primario-600',
                metodo === k ? 'border-primario-600 bg-primario-50 text-primario-700' : 'border-linea hover:border-primario-400')}>
                <input type="radio" name="metodo" value={k} checked={metodo === k} onChange={() => setMetodo(k)} className="sr-only" />
                <Icono className="size-5" aria-hidden="true" />{t}
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-4 text-xs text-suave">Al cobrar, la mesa queda libre si ya no tiene otras cuentas pendientes.</p>
      <div className="mt-8 flex justify-end gap-2">
        <Boton variante="secundario" onClick={alCerrar}>Volver</Boton>
        <Boton cargando={cargando} onClick={() => alConfirmar(metodo)}>Cobrar {quetzales(total)}</Boton>
      </div>
    </Modal>
  );
}

