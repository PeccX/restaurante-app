import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { api } from '../../lib/api';
import { quetzales, sumar } from '../../lib/formato';
import { useDatos } from '../../lib/useDatos';
import { useToast } from '../../components/Toast';
import { CATEGORIAS, Plato } from '../../components/Plato';
import { Aviso, Boton, Cargando, cx } from '../../components/ui';

// Mismas reglas que pedidos.schema.js
const schema = z.object({
  num_comensales: z.number().int().min(1).max(50),
  items: z.array(z.object({ producto_id: z.number().int().positive(), cantidad: z.number().int().min(1).max(99), comensal: z.number().int().min(1).nullable() }))
    .min(1, 'Agrega al menos un producto al pedido').max(50, 'Máximo 50 líneas por pedido'),
  notas: z.string().trim().max(255, 'Las notas no pueden pasar de 255 caracteres'),
}).refine((o) => o.items.every((i) => i.comensal === null || i.comensal <= o.num_comensales), { message: 'Hay productos asignados a un comensal que ya no está en la mesa' });

const clave = (i) => `${i.producto_id}-${i.comensal ?? 'c'}`;

export default function PedidoEditor() {
  const { id, pedidoId } = useParams();
  const editando = Boolean(pedidoId);
  const { datos, error } = useDatos(async () => {
    const pedido = editando ? await api.get(`/pedidos/${pedidoId}`) : null;
    const [mesa, productos] = await Promise.all([api.get(`/mesas/${pedido?.mesa_id ?? id}`), api.get('/productos?activo=true')]);
    return { pedido, mesa, productos };
  }, [id, pedidoId]);

  if (!datos) return error ? <Aviso>{error.status === 404 ? 'No se encontró la mesa o el pedido.' : error.message}</Aviso> : <Cargando />;
  if (datos.pedido && datos.pedido.estado !== 'pendiente')
    return <Aviso>Este pedido ya está {datos.pedido.estado === 'cancelado' ? 'cancelado' : 'en cocina'} y no se puede editar.</Aviso>;
  return <Editor {...datos} />;
}

function Editor({ pedido, mesa, productos }) {
  const navigate = useNavigate();
  const avisar = useToast();
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const [comensales, setComensales] = useState(pedido?.num_comensales ?? Math.min(2, mesa.capacidad));
  const [para, setPara] = useState(null);                       // null = compartido
  const [items, setItems] = useState(() => (pedido?.items ?? []).map(({ producto_id, cantidad, comensal }) => ({ producto_id, cantidad, comensal })));
  const [notas, setNotas] = useState(pedido?.notas ?? '');
  const [categoria, setCategoria] = useState('');
  const [buscar, setBuscar] = useState('');
  const [errores, setErrores] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const lineas = items.map((i) => ({ ...i, producto: porId.get(i.producto_id), precio: porId.get(i.producto_id)?.precio ?? 0 }));
  const total = sumar(lineas);
  const enPedido = (pid) => items.filter((i) => i.producto_id === pid).reduce((s, i) => s + i.cantidad, 0);
  const catalogo = productos.filter((p) => (!categoria || p.categoria === categoria) && p.nombre.toLowerCase().includes(buscar.trim().toLowerCase()));

  const cambiar = (prod, comensal, delta) => { setErrores(null); setItems((lista) => {
    const k = clave({ producto_id: prod, comensal });
    const existe = lista.find((i) => clave(i) === k);
    if (!existe) return delta > 0 ? [...lista, { producto_id: prod, cantidad: 1, comensal }] : lista;
    const cantidad = Math.min(99, existe.cantidad + delta);
    return cantidad < 1 ? lista.filter((i) => i !== existe) : lista.map((i) => (i === existe ? { ...i, cantidad } : i));
  }); };
  const quitar = (it) => setItems((l) => l.filter((i) => clave(i) !== clave(it)));

  const ajustarComensales = (n) => {
    if (n < 1 || n > mesa.capacidad) return;
    if (items.some((i) => i.comensal > n)) {
      // lo del comensal que se quita pasa a compartido
      setItems((l) => l.reduce((acc, i) => {
        const nuevo = i.comensal > n ? { ...i, comensal: null } : i;
        const igual = acc.find((x) => clave(x) === clave(nuevo));
        if (igual) { igual.cantidad = Math.min(99, igual.cantidad + nuevo.cantidad); return acc; }
        return [...acc, { ...nuevo }];
      }, []));
      avisar(`Lo del comensal ${n + 1} pasó a compartido.`);
    }
    if (para > n) setPara(null);
    setComensales(n);
  };

  const enviar = async () => {
    setErrores(null);
    const cuerpo = { num_comensales: comensales, items, notas };
    const r = schema.safeParse(cuerpo);
    if (!r.success) return setErrores([...new Set(r.error.issues.map((i) => i.message))]);
    const datos = { ...r.data, ...(r.data.notas ? {} : { notas: undefined }) };
    setEnviando(true);
    try {
      const p = pedido ? await api.put(`/pedidos/${pedido.id}`, datos) : await api.post('/pedidos', { mesa_id: mesa.id, ...datos });
      avisar(pedido ? 'Se guardaron los cambios del pedido.' : 'Pedido enviado a cocina.');
      navigate(`/pedidos/${p.id}`, { replace: true });
    } catch (e) {
      setErrores([e.status === 409 && e.details?.length ? `${e.message}:` : e.message, ...(e.details ?? []).map((d) => d.mensaje)]);
    } finally { setEnviando(false); }
  };

  const grupos = [...Array.from({ length: comensales }, (_, k) => k + 1), null]
    .map((c) => ({ c, lineas: lineas.filter((l) => l.comensal === c) })).filter((g) => g.lineas.length);
  const piezas = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <>
      <Link to={pedido ? `/pedidos/${pedido.id}` : `/mesas/${mesa.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primario-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />{pedido ? `Pedido #${pedido.id}` : `Mesa ${mesa.numero}`}
      </Link>
      <h1 className="titulo text-3xl sm:text-[2.5rem] leading-tight">{pedido ? `Editar pedido #${pedido.id}` : 'Nuevo pedido'}</h1>
      <p className="mt-1 mb-6 text-sm text-suave">Mesa {mesa.numero}. Elige para quién es cada producto antes de agregarlo.</p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_400px] items-start">
        <section aria-label="Productos">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
            <div className="relative sm:max-w-xs w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-suave" aria-hidden="true" />
              <label htmlFor="buscar-producto" className="sr-only">Buscar producto</label>
              <input id="buscar-producto" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar producto"
                className="h-11 w-full rounded-full border border-linea bg-white pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-primario-600/10 focus:border-primario-400" />
            </div>
          </div>
          <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2.5 mb-2">
            {[['', 'Todo'], ...Object.entries(CATEGORIAS).map(([k, v]) => [k, v.texto])].map(([k, t]) => (
              <button key={k} aria-pressed={categoria === k} onClick={() => setCategoria(k)}
                className={cx('rounded-full border px-5 h-10 text-sm transition-colors', categoria === k ? 'border-primario-600 bg-primario-600 text-white' : 'border-primario-600 text-primario-700 hover:bg-primario-50')}>{t}</button>
            ))}
          </div>
          {!catalogo.length ? (
            <p className="tarjeta mt-10 px-6 py-10 text-center text-sm text-suave">Ningún producto coincide con la búsqueda.</p>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-x-5 gap-y-16 pt-16">
              {catalogo.map((p) => <li key={p.id}><TarjetaProducto p={p} cantidad={enPedido(p.id)} alAgregar={() => cambiar(p.id, para, 1)} para={para} /></li>)}
            </ul>
          )}
        </section>

        <section id="pedido" aria-label="Pedido" className="tarjeta p-6 xl:sticky xl:top-28">
          <h2 className="titulo text-[23px]">Pedido</h2>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-fondo px-4 py-3">
            <span id="lbl-comensales" className="text-sm font-medium">Comensales</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="lbl-comensales">
              <Paso etiqueta="Quitar comensal" onClick={() => ajustarComensales(comensales - 1)} disabled={comensales <= 1}><Minus className="size-4" /></Paso>
              <span className="w-6 text-center font-semibold cifras" aria-live="polite">{comensales}</span>
              <Paso etiqueta="Agregar comensal" onClick={() => ajustarComensales(comensales + 1)} disabled={comensales >= mesa.capacidad}><Plus className="size-4" /></Paso>
            </div>
          </div>
          {comensales >= mesa.capacidad && <p className="mt-1.5 px-1 text-xs text-suave">La mesa {mesa.numero} es para {mesa.capacidad} personas.</p>}

          <p id="lbl-para" className="mt-5 mb-2 text-sm font-medium">Agregar para</p>
          <div role="radiogroup" aria-labelledby="lbl-para" className="flex flex-wrap gap-2">
            {[null, ...Array.from({ length: comensales }, (_, k) => k + 1)].map((c) => (
              <button key={c ?? 'c'} role="radio" aria-checked={para === c} onClick={() => setPara(c)}
                className={cx('rounded-full px-4 h-9 text-sm font-medium transition-colors', para === c ? 'bg-primario-600 text-white' : 'bg-primario-50 text-primario-700 hover:bg-primario-100')}>
                {c ? `Comensal ${c}` : 'Compartido'}
              </button>
            ))}
          </div>

          <div className="my-6 border-t border-linea" />
          {!grupos.length ? (
            <p className="py-6 text-center text-sm text-suave">Toca el botón + de un producto para agregarlo.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {grupos.map(({ c, lineas: ls }) => (
                <div key={c ?? 'c'}>
                  <p className="mb-2 text-xs font-medium text-suave">{c ? `Comensal ${c}` : 'Compartido (se divide entre todos)'}</p>
                  <ul className="flex flex-col gap-2.5">
                    {ls.map((l) => (
                      <li key={clave(l)} className="flex items-center gap-3 rounded-full bg-primario-50 py-2 pl-2 pr-4">
                        <Plato categoria={l.producto?.categoria} tam="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{l.producto?.nombre ?? `Producto ${l.producto_id}`}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Paso chico etiqueta={`Quitar uno de ${l.producto?.nombre}`} onClick={() => cambiar(l.producto_id, l.comensal, -1)}><Minus className="size-3" /></Paso>
                            <span className="text-sm cifras"><span className="text-primario-600">×</span>{l.cantidad}</span>
                            <Paso chico etiqueta={`Agregar uno de ${l.producto?.nombre}`} onClick={() => cambiar(l.producto_id, l.comensal, 1)} disabled={l.cantidad >= 99}><Plus className="size-3" /></Paso>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <button onClick={() => quitar(l)} aria-label={`Quitar ${l.producto?.nombre}`} className="rounded-full p-1 text-peligro-600/70 hover:text-peligro-600 hover:bg-peligro-50"><Trash2 className="size-4" /></button>
                          <span className="text-sm cifras">{quetzales(l.precio * l.cantidad)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <label htmlFor="notas" className="mt-6 mb-1.5 block text-sm font-medium">Notas para cocina <span className="font-normal text-suave">(opcional)</span></label>
          <textarea id="notas" rows={2} maxLength={255} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. una sin cebolla"
            className="w-full rounded-2xl border border-linea bg-white px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primario-600/10 focus:border-primario-400" />

          <div className="mt-6 flex items-baseline justify-between">
            <span className="text-sm text-suave">Total estimado</span>
            <span className="titulo text-2xl cifras">{quetzales(total)}</span>
          </div>
          {errores && <div className="mt-4"><Aviso><ul className="list-disc pl-4">{errores.map((e) => <li key={e}>{e}</li>)}</ul></Aviso></div>}
          <Boton onClick={enviar} cargando={enviando} className="mt-5 w-full h-12 text-base">{pedido ? 'Guardar cambios' : 'Enviar a cocina'}</Boton>
        </section>
      </div>

      {piezas > 0 && (
        <a href="#pedido" className="xl:hidden fixed bottom-4 inset-x-4 z-20 flex items-center justify-between rounded-full bg-tinta px-6 h-14 text-white shadow-xl">
          <span className="text-sm">{piezas} {piezas === 1 ? 'producto' : 'productos'}</span>
          <span className="font-semibold cifras">{quetzales(total)}</span>
        </a>
      )}
    </>
  );
}

const Paso = ({ etiqueta, chico, children, ...p }) => (
  <button type="button" aria-label={etiqueta} {...p}
    className={cx('grid place-items-center rounded-full bg-primario-600 text-white hover:bg-primario-700 disabled:bg-linea disabled:text-suave', chico ? 'size-6' : 'size-8')}>
    {children}
  </button>
);

function TarjetaProducto({ p, cantidad, alAgregar, para }) {
  const agotado = p.porciones === 0;
  const activa = cantidad > 0;
  return (
    <div className={cx('relative flex h-full flex-col rounded-[24px] px-5 pb-5 pt-16 transition-colors',
      activa ? 'bg-primario-600/70 text-white backdrop-blur' : 'bg-white/80 backdrop-blur shadow-[0_10px_30px_-12px_rgb(234_106_18/0.14)]', agotado && 'opacity-60')}>
      <Plato categoria={p.categoria} tam="lg" className="absolute -top-14 left-1/2 -translate-x-1/2" />
      {activa && <span className="absolute right-4 top-4 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primario-700 cifras">×{cantidad}</span>}
      <p className="font-semibold leading-snug">{p.nombre}</p>
      <p className={cx('mt-1 text-xs', activa ? 'text-white/85' : 'text-suave')}>
        {agotado ? 'Agotado' : p.porciones == null ? CATEGORIAS[p.categoria]?.texto.slice(0, -1) : `Quedan ${p.porciones}`}
      </p>
      <div className="mt-auto flex items-center justify-between pt-5">
        <span className={cx('font-semibold cifras', activa ? 'text-white' : 'text-primario-600')}>{quetzales(p.precio)}</span>
        <button onClick={alAgregar} disabled={agotado} aria-label={`Agregar ${p.nombre} ${para ? `al comensal ${para}` : 'como compartido'}`}
          className={cx('grid size-8 place-items-center rounded-full transition-colors disabled:cursor-not-allowed',
            activa ? 'bg-white text-primario-600 hover:bg-primario-50' : 'bg-primario-600 text-white hover:bg-primario-700')}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
