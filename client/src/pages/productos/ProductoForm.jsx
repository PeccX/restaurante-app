import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { api } from '../../lib/api';
import { erroresDelServidor, nombreTexto, numero, zodResolver } from '../../lib/validacion';
import { CATEGORIAS } from '../../components/Plato';
import { Aviso, Boton, Campo, Entrada, Selector, cx } from '../../components/ui';

// Mismas reglas que productos.schema.js
const schema = z.object({
  nombre: nombreTexto,
  categoria: z.enum(['platillo', 'bebida', 'entrada', 'postre']),
  precio: numero(z.number().min(0.01, 'El precio debe ser mayor a 0').max(99999.99, 'Máximo Q 99,999.99')),
  receta: z.array(z.object({
    insumo_id: numero(z.number({ required_error: 'Elige un insumo' }).int().positive('Elige un insumo')),
    cantidad: numero(z.number().positive('Debe ser mayor a 0').max(1_000_000)),
  })).max(30, 'Máximo 30 insumos')
    .refine((r) => new Set(r.map((i) => i.insumo_id)).size === r.length, 'Hay insumos repetidos en la receta'),
});

const vacio = { insumo_id: '', cantidad: '' };

const UNIDADES = { g: 'Gramos (g)', ml: 'Mililitros (ml)', unidad: 'Unidades' };
const SUFIJO = { g: 'g', ml: 'ml', unidad: 'u' };
const EJEMPLO = { g: 'Ej. 5 kg = 5000 g', ml: 'Ej. 2 litros = 2000 ml', unidad: 'Ej. 30 tortillas = 30' };
// Mismas reglas que insumos.schema.js; vacío cuenta como 0
const cantidadInsumo = z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)), z.number({ invalid_type_error: 'Debe ser número' }).min(0, 'No puede ser negativo').max(10_000_000));
const insumoSchema = z.object({ nombre: nombreTexto, unidad: z.enum(['g', 'ml', 'unidad']), stock: cantidadInsumo, stock_minimo: cantidadInsumo });

// producto = null para crear; si es para editar, ya trae su receta
export default function ProductoForm({ producto, insumos: iniciales, alGuardar, alCancelar, alCrearInsumo }) {
  const [error, setError] = useState(null);
  const [insumos, setInsumos] = useState(iniciales);
  const [creando, setCreando] = useState(false);
  const { register, control, handleSubmit, watch, setError: marcar, formState: { errors, isSubmitting, dirtyFields } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: producto?.nombre ?? '', categoria: producto?.categoria ?? 'platillo', precio: producto?.precio ?? '',
      receta: producto?.receta.map(({ insumo_id, cantidad }) => ({ insumo_id, cantidad })) ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'receta' });
  const elegidos = watch('receta').map((r) => Number(r.insumo_id));
  const porId = new Map(insumos.map((i) => [i.id, i]));

  const enviar = async (datos) => {
    setError(null);
    // al editar solo se mandan los campos modificados; la receta va completa si cambió
    const cuerpo = producto ? Object.fromEntries(Object.entries(datos).filter(([k]) => dirtyFields[k])) : datos;
    if (producto && !Object.keys(cuerpo).length) return alCancelar();
    try {
      alGuardar(producto ? await api.put(`/productos/${producto.id}`, cuerpo) : await api.post('/productos', cuerpo));
    } catch (e) {
      setError(erroresDelServidor(e, marcar, ['nombre', 'categoria', 'precio']));
    }
  };

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      <Aviso>{error}</Aviso>
      <Campo label="Nombre" id="nombre" error={errors.nombre?.message}>
        <Entrada id="nombre" autoComplete="off" error={errors.nombre} {...register('nombre')} />
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Categoría" id="categoria" error={errors.categoria?.message}>
          <Selector id="categoria" error={errors.categoria} {...register('categoria')}>
            {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.texto.slice(0, -1)}</option>)}
          </Selector>
        </Campo>
        <Campo label="Precio (Q)" id="precio" error={errors.precio?.message}>
          <Entrada id="precio" type="number" inputMode="decimal" step="0.01" min="0.01" error={errors.precio} {...register('precio')} />
        </Campo>
      </div>

      <fieldset className="mt-2">
        <legend className="text-sm font-medium">Receta</legend>
        <p className="mt-0.5 mb-3 text-sm text-suave">Cantidad de cada insumo que lleva una porción.</p>
        {fields.length > 0 && (
          <ul className="flex flex-col gap-3">
            {fields.map((f, i) => {
              const e = errors.receta?.[i];
              const unidad = porId.get(Number(watch(`receta.${i}.insumo_id`)))?.unidad;
              return (
                <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-2xl bg-fondo p-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_auto] sm:bg-transparent sm:p-0">
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`ins-${i}`} className="sr-only">Insumo {i + 1}</label>
                    <Selector id={`ins-${i}`} error={e?.insumo_id} {...register(`receta.${i}.insumo_id`)}>
                      <option value="">Elige un insumo</option>
                      {insumos.map((ins) => (
                        <option key={ins.id} value={ins.id} disabled={elegidos.includes(ins.id) && Number(watch(`receta.${i}.insumo_id`)) !== ins.id}>{ins.nombre}</option>
                      ))}
                    </Selector>
                    {e?.insumo_id && <p className="mt-1 text-sm text-peligro-600">{e.insumo_id.message}</p>}
                  </div>
                  <div>
                    <label htmlFor={`cant-${i}`} className="sr-only">Cantidad</label>
                    <div className="relative">
                      <Entrada id={`cant-${i}`} type="number" inputMode="decimal" step="any" min="0" placeholder="Cant." className={cx(unidad && 'pr-14')} error={e?.cantidad} {...register(`receta.${i}.cantidad`)} />
                      {unidad && <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[11px] text-suave">{unidad}</span>}
                    </div>
                    {e?.cantidad && <p className="mt-1 text-sm text-peligro-600">{e.cantidad.message}</p>}
                  </div>
                  <button type="button" onClick={() => remove(i)} aria-label={`Quitar insumo ${i + 1}`}
                    className="grid size-11 place-items-center rounded-full text-peligro-600/70 hover:bg-peligro-50 hover:text-peligro-600">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {errors.receta?.message && <p className="mt-2 text-sm text-peligro-600">{errors.receta.message}</p>}
        {creando ? (
          <NuevoInsumo alCerrar={() => setCreando(false)} alCrear={(ins) => {
            setInsumos((l) => [...l, ins].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            append({ insumo_id: String(ins.id), cantidad: '' }, { focusName: `receta.${fields.length}.cantidad` });
            setCreando(false); alCrearInsumo?.(ins);
          }} />
        ) : (
          <div className="mt-3 flex flex-wrap gap-1">
            <Boton type="button" variante="fantasma" className="px-3" onClick={() => append(vacio)} disabled={fields.length >= Math.min(30, insumos.length)}>
              <Plus className="size-4" aria-hidden="true" />Agregar insumo
            </Boton>
            <Boton type="button" variante="fantasma" className="px-3" onClick={() => setCreando(true)} disabled={fields.length >= 30}>
              <Plus className="size-4" aria-hidden="true" />Crear insumo
            </Boton>
          </div>
        )}
      </fieldset>

      <div className="mt-2 flex justify-end gap-2">
        <Boton type="button" variante="secundario" onClick={alCancelar}>Cancelar</Boton>
        <Boton type="submit" cargando={isSubmitting} disabled={creando}>{producto ? 'Guardar cambios' : 'Crear producto'}</Boton>
      </div>
    </form>
  );
}

// Va dentro del formulario del producto: no puede ser otro <form>, por eso se envía con onClick
function NuevoInsumo({ alCrear, alCerrar }) {
  const [error, setError] = useState(null);
  const { register, handleSubmit, watch, setError: marcar, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(insumoSchema), defaultValues: { nombre: '', unidad: 'g', stock: '', stock_minimo: '' },
  });
  const unidad = watch('unidad');
  const crear = async (datos) => {
    setError(null);
    try { alCrear(await api.post('/insumos', datos)); }
    catch (e) { setError(erroresDelServidor(e, marcar, ['nombre', 'unidad', 'stock', 'stock_minimo'])); }
  };
  return (
    <div className="mt-4 rounded-2xl border border-primario-100 bg-primario-50/60 p-4"
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); handleSubmit(crear)(); } }}>
      <p className="mb-3 text-sm font-medium">Nuevo insumo</p>
      <div className="flex flex-col gap-3">
        <Aviso>{error}</Aviso>
        <Campo label="Nombre del insumo" id="ni-nombre" error={errors.nombre?.message}>
          <Entrada id="ni-nombre" autoFocus autoComplete="off" error={errors.nombre} {...register('nombre')} />
        </Campo>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1"><Campo label="Unidad" id="ni-unidad" error={errors.unidad?.message}>
            <Selector id="ni-unidad" error={errors.unidad} {...register('unidad')}>
              {Object.entries(UNIDADES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </Selector>
          </Campo></div>
          {[['stock', 'ni-stock', 'Stock inicial'], ['stock_minimo', 'ni-min', 'Stock mínimo']].map(([campo, id, label]) => (
            <Campo key={campo} label={label} id={id} error={errors[campo]?.message}>
              <div className="relative">
                <Entrada id={id} type="number" inputMode="decimal" step="any" min="0" placeholder="0" className="pr-10" error={errors[campo]} {...register(campo)} />
                <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-xs text-suave">{SUFIJO[unidad]}</span>
              </div>
            </Campo>
          ))}
        </div>
        <p className="-mt-1 text-xs text-suave">{EJEMPLO[unidad]}. El mínimo es desde cuándo avisa que se está acabando.</p>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>Cancelar</Boton>
          <Boton type="button" cargando={isSubmitting} onClick={handleSubmit(crear)}>Crear y agregar</Boton>
        </div>
      </div>
    </div>
  );
}
