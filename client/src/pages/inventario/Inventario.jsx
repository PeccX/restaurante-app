import { useEffect, useState } from 'react';
import { History, Pencil, Search, SlidersHorizontal } from 'lucide-react';
import { api, qs } from '../../lib/api';
import { cantidad, nivel } from '../../lib/insumos';
import { useDatos } from '../../lib/useDatos';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { Aviso, Boton, Cargando, Confirmar, Encabezado, Insignia, Modal, Vacio, cx } from '../../components/ui';
import InsumoForm from './InsumoForm';
import AjusteForm from './AjusteForm';
import Historial from './Historial';

const FILTROS = [['activos', 'Todos'], ['bajo', 'Por acabarse'], ['inactivos', 'Inactivos']];
const PARAMS = { activos: { activo: true }, bajo: { activo: true, bajo_minimo: true }, inactivos: { activo: false } };
const INSIGNIA = { agotado: ['peligro', 'Agotado'], bajo: ['aviso', 'Por acabarse'] };
const BARRA = { agotado: 'bg-peligro-600', bajo: 'bg-aviso-500', ok: 'bg-exito-600' };

// La barra llega al 100% con el triple del mínimo
const porcentaje = (i) => (Number(i.stock_minimo) > 0 ? Math.min(100, (i.stock / (i.stock_minimo * 3)) * 100) : i.stock > 0 ? 100 : 0);

export default function Inventario() {
  const avisar = useToast();
  const { user } = useAuth();
  const admin = user.rol === 'admin';
  const [filtro, setFiltro] = useState('activos');
  const [buscar, setBuscar] = useState('');
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState(undefined);       // undefined = cerrado, null = nuevo
  const [ajustando, setAjustando] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [cambiarEstado, setCambiarEstado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQ(buscar.trim()), 300); return () => clearTimeout(t); }, [buscar]);
  const { datos: insumos, error, recargar } = useDatos(() => api.get(`/insumos${qs({ ...PARAMS[filtro], q })}`), [filtro, q]);
  const { datos: bajos, recargar: recargarBajos } = useDatos(() => api.get('/insumos?activo=true&bajo_minimo=true'), []);
  const refrescar = () => { recargar(); recargarBajos(); };

  const guardado = (i) => {
    avisar(editando ? `Se guardaron los cambios de ${i.nombre}.` : `Se creó ${i.nombre}.`);
    setEditando(undefined); refrescar();
  };
  const ajustado = (i) => {
    avisar(`${i.nombre} quedó en ${cantidad(i.stock, i.unidad)}.`);
    setAjustando(null); refrescar();
  };
  const confirmarEstado = async () => {
    const i = cambiarEstado;
    setOcupado(true);
    try {
      if (i.activo) await api.del(`/insumos/${i.id}`); else await api.put(`/insumos/${i.id}`, { activo: true });
      avisar(i.activo ? `${i.nombre} ya no aparece en recetas ni en el inventario.` : `${i.nombre} vuelve al inventario.`);
      refrescar();
    } catch (e) { avisar(e.message, 'error'); }
    finally { setOcupado(false); setCambiarEstado(null); }
  };

  const filtros = admin ? FILTROS : FILTROS.slice(0, 2);
  return (
    <>
      <Encabezado titulo="Inventario" descripcion="Lo que hay en bodega. Cada pedido que entra a cocina descuenta lo que lleva su receta.">
        {admin && <Boton onClick={() => setEditando(null)}>Nuevo insumo</Boton>}
      </Encabezado>

      {bajos?.length > 0 && filtro !== 'bajo' && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-aviso-100 bg-aviso-50 p-4 text-sm text-aviso-700 sm:flex-row sm:items-center sm:justify-between">
          <p>{bajos.length === 1 ? `${bajos[0].nombre} está` : `${bajos.length} insumos están`} en el mínimo o por debajo.</p>
          <Boton variante="secundario" className="h-9 self-start px-4 sm:self-auto" onClick={() => setFiltro('bajo')}>Ver {bajos.length === 1 ? 'cuál' : 'cuáles'}</Boton>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" aria-hidden="true" />
          <label htmlFor="buscar" className="sr-only">Buscar insumo</label>
          <input id="buscar" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar insumo"
            className="h-11 w-full rounded-full border border-linea bg-white pl-11 pr-4 text-sm focus:border-primario-400 focus:outline-none focus:ring-4 focus:ring-primario-600/10" />
        </div>
        <div role="group" aria-label="Mostrar" className="inline-flex self-start rounded-full border border-linea bg-white p-1">
          {filtros.map(([v, t]) => (
            <button key={v} aria-pressed={filtro === v} onClick={() => setFiltro(v)}
              className={cx('h-8 rounded-full px-4 text-sm font-medium', filtro === v ? 'bg-primario-600 text-white' : 'text-suave hover:text-primario-700')}>
              {t}{v === 'bajo' && bajos?.length > 0 && <span className="ml-1.5 cifras">{bajos.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <Aviso>{error?.message}</Aviso>
      {!insumos ? <Cargando /> : !insumos.length ? (
        <Vacio titulo={q ? `Nada coincide con “${q}”.` : filtro === 'bajo' ? 'Todo está por encima del mínimo.' : 'No hay insumos en esta vista.'} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
          {insumos.map((i) => {
            const n = nivel(i);
            return (
              <li key={i.id} className={cx('tarjeta flex flex-col p-5', !i.activo && 'opacity-70')}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{i.nombre}</h2>
                  {admin && (
                    <button onClick={() => setEditando(i)} aria-label={`Editar ${i.nombre}`} title="Editar"
                      className="-mr-2 -mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-suave hover:bg-primario-50 hover:text-primario-700">
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="titulo text-3xl cifras">{cantidad(i.stock, i.unidad)}</p>
                  {!i.activo ? <Insignia>Inactivo</Insignia> : INSIGNIA[n] && <Insignia color={INSIGNIA[n][0]}>{INSIGNIA[n][1]}</Insignia>}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fondo" aria-hidden="true">
                  <div className={cx('h-full rounded-full', BARRA[n])} style={{ width: `${porcentaje(i)}%` }} />
                </div>
                <p className="mt-2 text-xs text-suave">Mínimo: <span className="cifras">{cantidad(i.stock_minimo, i.unidad)}</span></p>
                <div className="-mx-2 mt-4 flex flex-wrap gap-1 border-t border-linea pt-3">
                  {i.activo ? (
                    <Boton variante="fantasma" className="h-9 px-3!" onClick={() => setAjustando(i)}>
                      <SlidersHorizontal className="size-4" aria-hidden="true" />Ajustar
                    </Boton>
                  ) : null}
                  <Boton variante="fantasma" className="h-9 px-3!" onClick={() => setHistorial(i)}>
                    <History className="size-4" aria-hidden="true" />Historial
                  </Boton>
                  {admin && <>
                    <Boton variante={i.activo ? 'fantasmaPeligro' : 'fantasma'} className="h-9 px-3!" onClick={() => setCambiarEstado(i)}>
                      {i.activo ? 'Desactivar' : 'Reactivar'}
                    </Boton>
                  </>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal abierto={editando !== undefined} alCerrar={() => setEditando(undefined)} titulo={editando ? `Editar ${editando.nombre}` : 'Nuevo insumo'} ancho="max-w-md">
        <InsumoForm key={editando?.id ?? 'nuevo'} insumo={editando} alGuardar={guardado} alCancelar={() => setEditando(undefined)} />
      </Modal>
      <Modal abierto={Boolean(ajustando)} alCerrar={() => setAjustando(null)} titulo={`Ajustar ${ajustando?.nombre ?? ''}`} ancho="max-w-md">
        {ajustando && <AjusteForm key={ajustando.id} insumo={ajustando} alGuardar={ajustado} alCancelar={() => setAjustando(null)} />}
      </Modal>
      <Modal abierto={Boolean(historial)} alCerrar={() => setHistorial(null)} titulo={`Historial de ${historial?.nombre ?? ''}`} ancho="max-w-2xl">
        {historial && <Historial key={historial.id} insumo={historial} />}
      </Modal>
      <Confirmar abierto={Boolean(cambiarEstado)} alCerrar={() => setCambiarEstado(null)} cargando={ocupado} alConfirmar={confirmarEstado}
        variante={cambiarEstado?.activo ? 'peligro' : 'primario'}
        titulo={cambiarEstado?.activo ? `¿Desactivar ${cambiarEstado?.nombre}?` : `¿Reactivar ${cambiarEstado?.nombre}?`}
        accion={cambiarEstado?.activo ? 'Desactivar' : 'Reactivar'}
        mensaje={cambiarEstado?.activo
          ? 'Deja de aparecer al armar recetas. Si algún producto activo lo usa, primero hay que quitarlo de su receta.'
          : 'Vuelve a aparecer en el inventario y al armar recetas.'} />
    </>
  );
}
