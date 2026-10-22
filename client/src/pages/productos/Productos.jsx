import { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { api, qs } from '../../lib/api';
import { quetzales } from '../../lib/formato';
import { useDatos } from '../../lib/useDatos';
import { useToast } from '../../components/Toast';
import { CATEGORIAS, Plato } from '../../components/Plato';
import { Aviso, Boton, Cargando, Confirmar, Encabezado, Insignia, Modal, Vacio, cx } from '../../components/ui';
import ProductoForm from './ProductoForm';

const ESTADOS = [['true', 'Activos'], ['false', 'Inactivos'], ['', 'Todos']];

export default function Productos() {
  const avisar = useToast();
  const [categoria, setCategoria] = useState('');
  const [activo, setActivo] = useState('true');
  const [buscar, setBuscar] = useState('');
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState(undefined);       // undefined = cerrado, null = nuevo
  const [cargandoForm, setCargandoForm] = useState(false);
  const [cambiarEstado, setCambiarEstado] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQ(buscar.trim()), 300); return () => clearTimeout(t); }, [buscar]);
  const { datos: productos, error, recargar } = useDatos(() => api.get(`/productos${qs({ activo, categoria, q })}`), [activo, categoria, q]);
  const { datos: insumos, recargar: recargarInsumos } = useDatos(() => api.get('/insumos?activo=true'), []);

  // para editar hace falta la receta, que no viene en el listado
  const abrir = async (p) => {
    if (!p) return setEditando(null);
    setCargandoForm(true);
    try { setEditando(await api.get(`/productos/${p.id}`)); }
    catch (e) { avisar(e.message, 'error'); }
    finally { setCargandoForm(false); }
  };

  const guardado = (p) => {
    avisar(editando ? `Se guardaron los cambios de ${p.nombre}.` : `Se creó ${p.nombre}.`);
    setEditando(undefined); recargar();
  };

  const eliminar = async () => {
    const p = borrar;
    setOcupado(true);
    try {
      await api.del(`/productos/${p.id}/definitivo`);
      avisar(`Se eliminó ${p.nombre}.`); recargar();
    } catch (e) { avisar(e.message, 'error'); }
    finally { setOcupado(false); setBorrar(null); }
  };

  const confirmarEstado = async () => {
    const p = cambiarEstado;
    setOcupado(true);
    try {
      if (p.activo) await api.del(`/productos/${p.id}`); else await api.put(`/productos/${p.id}`, { activo: true });
      avisar(p.activo ? `${p.nombre} ya no aparece al tomar pedidos.` : `${p.nombre} vuelve a estar en el menú.`);
      recargar();
    } catch (e) { avisar(e.message, 'error'); }
    finally { setOcupado(false); setCambiarEstado(null); }
  };

  return (
    <>
      <Encabezado titulo="Productos" descripcion="El menú del restaurante y lo que gasta cada producto del inventario.">
        <Boton onClick={() => abrir(null)} disabled={!insumos}>Nuevo producto</Boton>
      </Encabezado>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" aria-hidden="true" />
          <label htmlFor="buscar" className="sr-only">Buscar producto</label>
          <input id="buscar" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar producto"
            className="h-11 w-full rounded-full border border-linea bg-white pl-11 pr-4 text-sm focus:border-primario-400 focus:outline-none focus:ring-4 focus:ring-primario-600/10" />
        </div>
        <div role="group" aria-label="Estado" className="inline-flex self-start rounded-full border border-linea bg-white p-1">
          {ESTADOS.map(([v, t]) => (
            <button key={t} aria-pressed={activo === v} onClick={() => setActivo(v)}
              className={cx('h-8 rounded-full px-4 text-sm font-medium', activo === v ? 'bg-primario-600 text-white' : 'text-suave hover:text-primario-700')}>{t}</button>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Categoría" className="mb-2 flex flex-wrap gap-2.5">
        {[['', 'Todo'], ...Object.entries(CATEGORIAS).map(([k, v]) => [k, v.texto])].map(([k, t]) => (
          <button key={k} aria-pressed={categoria === k} onClick={() => setCategoria(k)}
            className={cx('h-10 rounded-full border px-5 text-sm transition-colors', categoria === k ? 'border-primario-600 bg-primario-600 text-white' : 'border-primario-600 text-primario-700 hover:bg-primario-50')}>{t}</button>
        ))}
      </div>

      <Aviso>{error?.message}</Aviso>
      {!productos ? <Cargando /> : !productos.length ? (
        <div className="mt-6"><Vacio titulo={q ? `Ningún producto coincide con “${q}”.` : 'No hay productos en esta vista.'}>
          {!q && activo === 'true' && 'Usa “Nuevo producto” para agregar algo al menú.'}
        </Vacio></div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-16 pt-16 md:grid-cols-3 xl:grid-cols-4">
          {productos.map((p) => (
            <li key={p.id}>
              <article className={cx('relative flex h-full flex-col rounded-[24px] bg-white px-5 pb-4 pt-16 shadow-[0_10px_30px_-12px_rgb(234_106_18/0.14)]', !p.activo && 'opacity-70')}>
                <Plato categoria={p.categoria} tam="lg" className={cx('absolute -top-14 left-1/2 -translate-x-1/2', !p.activo && 'grayscale')} />
                {!p.activo && <span className="absolute left-4 top-4"><Insignia>Inactivo</Insignia></span>}
                {!p.con_ventas && (
                  <button onClick={() => setBorrar(p)} aria-label={`Eliminar ${p.nombre}`} title="Eliminar: nunca se ha vendido"
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-peligro-50 text-peligro-600 hover:bg-peligro-600 hover:text-white">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
                <h2 className="font-semibold leading-snug">{p.nombre}</h2>
                <p className="mt-1 text-xs text-suave">
                  {CATEGORIAS[p.categoria]?.texto.slice(0, -1)}
                  {p.porciones == null ? ', sin receta' : p.porciones === 0 ? ', agotado' : `, alcanza para ${p.porciones}`}
                </p>
                <p className="mt-auto pt-4 font-semibold text-primario-600 cifras">{quetzales(p.precio)}</p>
                <div className="mt-3 grid grid-cols-1 gap-1 border-t border-linea pt-3 min-[400px]:grid-cols-2">
                  <Boton variante="fantasma" className="h-9 min-w-0 px-2" disabled={cargandoForm} onClick={() => abrir(p)}>Editar</Boton>
                  <Boton variante={p.activo ? 'fantasmaPeligro' : 'fantasma'} className="h-9 min-w-0 px-2" onClick={() => setCambiarEstado(p)}>
                    {p.activo ? 'Desactivar' : 'Reactivar'}
                  </Boton>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Modal abierto={editando !== undefined} alCerrar={() => setEditando(undefined)} titulo={editando ? `Editar ${editando.nombre}` : 'Nuevo producto'} ancho="max-w-2xl">
        {insumos && <ProductoForm key={editando?.id ?? 'nuevo'} producto={editando} insumos={insumos} alGuardar={guardado} alCancelar={() => setEditando(undefined)}
          alCrearInsumo={(ins) => { avisar(`Se creó el insumo ${ins.nombre}.`); recargarInsumos(); }} />}
      </Modal>
      <Confirmar abierto={Boolean(borrar)} alCerrar={() => setBorrar(null)} cargando={ocupado} alConfirmar={eliminar}
        titulo={`¿Eliminar ${borrar?.nombre}?`} accion="Eliminar"
        mensaje="Se borra junto con su receta y no se puede deshacer. Como nunca se ha vendido, no afecta pedidos ni reportes." />
      <Confirmar abierto={Boolean(cambiarEstado)} alCerrar={() => setCambiarEstado(null)} cargando={ocupado} alConfirmar={confirmarEstado}
        variante={cambiarEstado?.activo ? 'peligro' : 'primario'}
        titulo={cambiarEstado?.activo ? `¿Desactivar ${cambiarEstado?.nombre}?` : `¿Reactivar ${cambiarEstado?.nombre}?`}
        accion={cambiarEstado?.activo ? 'Desactivar' : 'Reactivar'}
        mensaje={cambiarEstado?.activo
          ? 'Deja de aparecer al tomar pedidos. Los pedidos anteriores y los reportes lo conservan.'
          : 'Vuelve a aparecer al tomar pedidos con su receta actual.'} />
    </>
  );
}
