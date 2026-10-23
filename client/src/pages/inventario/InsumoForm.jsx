import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import { erroresDelServidor, zodResolver } from '../../lib/validacion';
import { EJEMPLO, SUFIJO, UNIDADES, insumoSchema } from '../../lib/insumos';
import { Aviso, Boton, Campo, Entrada, Selector } from '../../components/ui';

// Al editar no se toca el stock: eso va por "Ajustar" para que quede en el historial
const editarSchema = insumoSchema.omit({ stock: true });

const ConUnidad = ({ id, unidad, error, ...p }) => (
  <div className="relative">
    <Entrada id={id} type="number" inputMode="decimal" step="any" min="0" placeholder="0" className="pr-10" error={error} {...p} />
    <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-xs text-suave">{SUFIJO[unidad]}</span>
  </div>
);

export default function InsumoForm({ insumo, alGuardar, alCancelar }) {
  const [error, setError] = useState(null);
  const { register, handleSubmit, watch, setError: marcar, formState: { errors, isSubmitting, dirtyFields } } = useForm({
    resolver: zodResolver(insumo ? editarSchema : insumoSchema),
    defaultValues: insumo
      ? { nombre: insumo.nombre, unidad: insumo.unidad, stock_minimo: insumo.stock_minimo }
      : { nombre: '', unidad: 'g', stock: '', stock_minimo: '' },
  });
  const unidad = watch('unidad');
  const enviar = async (datos) => {
    setError(null);
    const cuerpo = insumo ? Object.fromEntries(Object.entries(datos).filter(([k]) => dirtyFields[k])) : datos;
    if (insumo && !Object.keys(cuerpo).length) return alCancelar();
    try { alGuardar(insumo ? await api.put(`/insumos/${insumo.id}`, cuerpo) : await api.post('/insumos', cuerpo)); }
    catch (e) { setError(erroresDelServidor(e, marcar, ['nombre', 'unidad', 'stock', 'stock_minimo'])); }
  };
  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      <Aviso>{error}</Aviso>
      <Campo label="Nombre" id="nombre" error={errors.nombre?.message}>
        <Entrada id="nombre" autoFocus autoComplete="off" error={errors.nombre} {...register('nombre')} />
      </Campo>
      <Campo label="Unidad" id="unidad" error={errors.unidad?.message} ayuda={insumo && 'Si ya está en alguna receta, la unidad no se puede cambiar.'}>
        <Selector id="unidad" error={errors.unidad} {...register('unidad')}>
          {Object.entries(UNIDADES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </Selector>
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        {!insumo && (
          <Campo label="Stock inicial" id="stock" error={errors.stock?.message}>
            <ConUnidad id="stock" unidad={unidad} error={errors.stock} {...register('stock')} />
          </Campo>
        )}
        <Campo label="Stock mínimo" id="stock_minimo" error={errors.stock_minimo?.message}>
          <ConUnidad id="stock_minimo" unidad={unidad} error={errors.stock_minimo} {...register('stock_minimo')} />
        </Campo>
      </div>
      <p className="-mt-2 text-xs text-suave">{EJEMPLO[unidad]}. El mínimo es desde cuándo avisa que se está acabando.</p>
      <div className="mt-2 flex justify-end gap-2">
        <Boton type="button" variante="secundario" onClick={alCancelar}>Cancelar</Boton>
        <Boton type="submit" cargando={isSubmitting}>{insumo ? 'Guardar cambios' : 'Crear insumo'}</Boton>
      </div>
    </form>
  );
}
