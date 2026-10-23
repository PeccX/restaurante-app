import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import { erroresDelServidor, numero, zodResolver } from '../../lib/validacion';
import { SUFIJO, cantidad } from '../../lib/insumos';
import { Aviso, Boton, Campo, Entrada, cx } from '../../components/ui';

const MODOS = {
  entrada: { texto: 'Entrada', label: 'Cuánto entra', motivos: ['Compra', 'Corrección'] },
  salida: { texto: 'Salida', label: 'Cuánto sale', motivos: ['Merma', 'Se venció', 'Corrección'] },
  conteo: { texto: 'Conteo', label: 'Cuánto contaste', motivos: ['Conteo físico'] },
};

// Mismas reglas que ajusteBody en insumos.schema.js
const crearSchema = (modo, stock, unidad) => z.object({
  cantidad: numero(z.number().min(modo === 'conteo' ? 0 : 0.001, modo === 'conteo' ? 'No puede ser negativo' : 'Debe ser mayor a 0').max(10_000_000, 'Máximo 10,000,000')),
  motivo: z.string().trim().min(1, 'Escribe el motivo').min(3, 'Mínimo 3 caracteres').max(200),
}).superRefine((d, ctx) => {
  if (modo === 'salida' && d.cantidad > stock) ctx.addIssue({ code: 'custom', path: ['cantidad'], message: `Solo hay ${cantidad(stock, unidad)}` });
  if (modo === 'conteo' && d.cantidad === stock) ctx.addIssue({ code: 'custom', path: ['cantidad'], message: 'Es lo mismo que ya hay' });
});

export default function AjusteForm({ insumo, alGuardar, alCancelar }) {
  const [modo, setModo] = useState('entrada');
  const [error, setError] = useState(null);
  const stock = Number(insumo.stock);
  const { register, handleSubmit, watch, setValue, clearErrors, setError: marcar, formState: { errors, isSubmitting } } = useForm({
    resolver: (v, c, o) => zodResolver(crearSchema(modo, stock, insumo.unidad))(v, c, o), defaultValues: { cantidad: '', motivo: '' },
  });
  const valor = Number(watch('cantidad'));
  const delta = !watch('cantidad') || Number.isNaN(valor) ? null : modo === 'entrada' ? valor : modo === 'salida' ? -valor : valor - stock;
  const resultado = delta === null ? null : Math.round((stock + delta) * 1000) / 1000;

  const cambiarModo = (m) => { setModo(m); clearErrors(); setValue('motivo', ''); };
  const enviar = async ({ motivo }) => {
    setError(null);
    try { alGuardar(await api.post(`/insumos/${insumo.id}/ajuste`, { cantidad: Math.round(delta * 1000) / 1000, motivo })); }
    catch (e) { setError(erroresDelServidor(e, marcar, ['cantidad', 'motivo'])); }
  };

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-suave">Hay <span className="cifras font-medium text-tinta">{cantidad(stock, insumo.unidad)}</span>.</p>
      <div role="group" aria-label="Tipo de ajuste" className="grid grid-cols-3 rounded-full border border-linea bg-white p-1">
        {Object.entries(MODOS).map(([m, { texto }]) => (
          <button key={m} type="button" aria-pressed={modo === m} onClick={() => cambiarModo(m)}
            className={cx('h-9 rounded-full text-sm font-medium', modo === m ? 'bg-primario-600 text-white' : 'text-suave hover:text-primario-700')}>{texto}</button>
        ))}
      </div>
      <Aviso>{error}</Aviso>
      <Campo label={MODOS[modo].label} id="cantidad" error={errors.cantidad?.message}>
        <div className="relative">
          <Entrada id="cantidad" type="number" inputMode="decimal" step="any" min="0" autoFocus className="pr-10" error={errors.cantidad} {...register('cantidad')} />
          <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-xs text-suave">{SUFIJO[insumo.unidad]}</span>
        </div>
      </Campo>
      <Campo label="Motivo" id="motivo" error={errors.motivo?.message}>
        <Entrada id="motivo" autoComplete="off" maxLength={200} error={errors.motivo} {...register('motivo')} />
      </Campo>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        {MODOS[modo].motivos.map((m) => (
          <button key={m} type="button" onClick={() => setValue('motivo', m, { shouldValidate: Boolean(errors.motivo) })}
            className="rounded-full border border-linea bg-white px-3 py-1 text-xs text-suave hover:border-primario-400 hover:text-primario-700">{m}</button>
        ))}
      </div>
      {resultado !== null && resultado >= 0 && delta !== 0 && (
        <p className="rounded-2xl bg-fondo px-4 py-3 text-sm">
          Quedará en <span className="cifras font-semibold">{cantidad(resultado, insumo.unidad)}</span>
          <span className={cx('ml-1 cifras', delta > 0 ? 'text-exito-600' : 'text-peligro-600')}>({delta > 0 ? '+' : '−'}{cantidad(Math.abs(delta), insumo.unidad)})</span>
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Boton type="button" variante="secundario" onClick={alCancelar}>Cancelar</Boton>
        <Boton type="submit" cargando={isSubmitting}>Guardar ajuste</Boton>
      </div>
    </form>
  );
}
