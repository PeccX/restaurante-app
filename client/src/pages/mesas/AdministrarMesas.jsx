import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { api, qs } from '../../lib/api';
import { erroresDelServidor, numero, zodResolver } from '../../lib/validacion';
import { useDatos } from '../../lib/useDatos';
import { useToast } from '../../components/Toast';
import { Aviso, Boton, Campo, Cargando, Confirmar, Encabezado, Entrada, Insignia, Modal, Vacio, cx } from '../../components/ui';

// Mismas reglas que mesas.schema.js
const schema = z.object({
  numero: numero(z.number().int('Debe ser un número entero').min(1, 'Debe ser mayor a 0').max(999, 'Máximo 999')),
  capacidad: numero(z.number().int('Debe ser un número entero').min(1, 'Debe ser al menos 1 persona').max(50, 'Máximo 50 personas')),
});
const FILTROS = [['true', 'Activas'], ['false', 'Inactivas'], ['', 'Todas']];

export default function AdministrarMesas() {
  const avisar = useToast();
  const [activo, setActivo] = useState('true');
  const [editando, setEditando] = useState(undefined);       // undefined = cerrado, null = nueva
  const [cambiarEstado, setCambiarEstado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const { datos: mesas, error, recargar } = useDatos(() => api.get(`/mesas${qs({ activo })}`), [activo]);

  const guardada = (m) => {
    avisar(editando ? `Se guardaron los cambios de la mesa ${m.numero}.` : `Se creó la mesa ${m.numero}.`);
    setEditando(undefined); recargar();
  };
  const confirmarEstado = async () => {
    const m = cambiarEstado;
    setOcupado(true);
    try {
      if (m.activo) await api.del(`/mesas/${m.id}`); else await api.put(`/mesas/${m.id}`, { activo: true });
      avisar(m.activo ? `La mesa ${m.numero} ya no aparece en el salón.` : `La mesa ${m.numero} vuelve al salón.`);
      recargar();
    } catch (e) { avisar(e.message, 'error'); }
    finally { setOcupado(false); setCambiarEstado(null); }
  };

  const acciones = (m) => (
    <div className="flex justify-end gap-1">
      <Boton variante="fantasma" className="h-9 px-3" onClick={() => setEditando(m)}>Editar</Boton>
      <Boton variante={m.activo ? 'fantasmaPeligro' : 'fantasma'} className="h-9 px-3" onClick={() => setCambiarEstado(m)}
        disabled={m.activo && m.estado === 'ocupada'} title={m.activo && m.estado === 'ocupada' ? 'Tiene pedidos sin pagar' : undefined}>
        {m.activo ? 'Desactivar' : 'Reactivar'}
      </Boton>
    </div>
  );
  const estado = (m) => !m.activo ? <Insignia>Inactiva</Insignia>
    : m.estado === 'ocupada' ? <Insignia color="primario">Ocupada</Insignia> : <Insignia color="exito">Libre</Insignia>;

  return (
    <>
      <Link to="/mesas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primario-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />Mesas
      </Link>
      <Encabezado titulo="Administrar mesas" descripcion="Las mesas del salón y cuántas personas caben en cada una. Una mesa ocupada no se puede desactivar.">
        <Boton onClick={() => setEditando(null)}>Nueva mesa</Boton>
      </Encabezado>
      <div role="group" aria-label="Estado" className="mb-4 inline-flex rounded-full border border-linea bg-white p-1">
        {FILTROS.map(([v, t]) => (
          <button key={t} aria-pressed={activo === v} onClick={() => setActivo(v)}
            className={cx('h-8 rounded-full px-4 text-sm font-medium', activo === v ? 'bg-primario-600 text-white' : 'text-suave hover:text-primario-700')}>{t}</button>
        ))}
      </div>

      <Aviso>{error?.message}</Aviso>
      {!mesas ? <Cargando /> : !mesas.length ? (
        <Vacio titulo="No hay mesas en esta vista.">{activo === 'true' && 'Usa “Nueva mesa” para agregar la primera.'}</Vacio>
      ) : (
        <div className="tarjeta overflow-hidden">
          <table className="hidden w-full text-sm sm:table">
            <thead className="border-b border-linea bg-primario-50/60 text-left text-suave">
              <tr><th className="px-5 py-3.5 font-medium">Mesa</th><th className="px-5 py-3.5 font-medium">Capacidad</th>
                <th className="px-5 py-3.5 font-medium">Estado</th><th className="px-5 py-3.5"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {mesas.map((m) => (
                <tr key={m.id} className={m.activo ? '' : 'text-suave'}>
                  <td className="px-5 py-3"><span className="titulo text-xl cifras">{m.numero}</span></td>
                  <td className="px-5 py-3 cifras">{m.capacidad} {m.capacidad === 1 ? 'persona' : 'personas'}</td>
                  <td className="px-5 py-3">{estado(m)}</td>
                  <td className="px-3 py-1.5">{acciones(m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-linea sm:hidden">
            {mesas.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="titulo text-xl cifras">Mesa {m.numero}</p>
                  <p className="text-sm text-suave">{m.capacidad} {m.capacidad === 1 ? 'persona' : 'personas'}</p>
                  <div className="mt-1">{estado(m)}</div>
                </div>
                {acciones(m)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal abierto={editando !== undefined} alCerrar={() => setEditando(undefined)} titulo={editando ? `Editar mesa ${editando.numero}` : 'Nueva mesa'} ancho="max-w-md">
        <MesaForm key={editando?.id ?? 'nueva'} mesa={editando} alGuardar={guardada} alCancelar={() => setEditando(undefined)} />
      </Modal>
      <Confirmar abierto={Boolean(cambiarEstado)} alCerrar={() => setCambiarEstado(null)} cargando={ocupado} alConfirmar={confirmarEstado}
        variante={cambiarEstado?.activo ? 'peligro' : 'primario'}
        titulo={cambiarEstado?.activo ? `¿Desactivar la mesa ${cambiarEstado?.numero}?` : `¿Reactivar la mesa ${cambiarEstado?.numero}?`}
        accion={cambiarEstado?.activo ? 'Desactivar' : 'Reactivar'}
        mensaje={cambiarEstado?.activo
          ? 'Deja de aparecer en el salón para tomar pedidos. Sus pedidos anteriores se conservan.'
          : 'Vuelve a aparecer en el salón como libre.'} />
    </>
  );
}

function MesaForm({ mesa, alGuardar, alCancelar }) {
  const [error, setError] = useState(null);
  const { register, handleSubmit, setError: marcar, formState: { errors, isSubmitting, dirtyFields } } = useForm({
    resolver: zodResolver(schema), defaultValues: { numero: mesa?.numero ?? '', capacidad: mesa?.capacidad ?? 4 },
  });
  const enviar = async (datos) => {
    setError(null);
    const cuerpo = mesa ? Object.fromEntries(Object.entries(datos).filter(([k]) => dirtyFields[k])) : datos;
    if (mesa && !Object.keys(cuerpo).length) return alCancelar();
    try { alGuardar(mesa ? await api.put(`/mesas/${mesa.id}`, cuerpo) : await api.post('/mesas', cuerpo)); }
    catch (e) { setError(erroresDelServidor(e, marcar, ['numero', 'capacidad'])); }
  };
  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      <Aviso>{error}</Aviso>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Número" id="numero" error={errors.numero?.message}>
          <Entrada id="numero" type="number" inputMode="numeric" min="1" max="999" autoFocus error={errors.numero} {...register('numero')} />
        </Campo>
        <Campo label="Capacidad" id="capacidad" error={errors.capacidad?.message} ayuda="Personas que caben.">
          <Entrada id="capacidad" type="number" inputMode="numeric" min="1" max="50" error={errors.capacidad} {...register('capacidad')} />
        </Campo>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Boton type="button" variante="secundario" onClick={alCancelar}>Cancelar</Boton>
        <Boton type="submit" cargando={isSubmitting}>{mesa ? 'Guardar cambios' : 'Crear mesa'}</Boton>
      </div>
    </form>
  );
}
