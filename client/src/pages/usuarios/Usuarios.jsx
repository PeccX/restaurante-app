import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { Aviso, Boton, Cargando, Confirmar, Encabezado, Entrada, Insignia, Modal, Vacio, cx } from '../../components/ui';
import UsuarioForm, { ROLES } from './UsuarioForm';

const FILTROS = [['true', 'Activos'], ['false', 'Inactivos'], ['', 'Todos']];
const COLOR_ROL = { admin: 'primario', mesero: 'exito', cocina: 'aviso' };

export default function Usuarios() {
  const { user: yo } = useAuth();
  const avisar = useToast();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [activo, setActivo] = useState('true');
  const [buscar, setBuscar] = useState('');
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState(undefined);      // undefined = cerrado, null = nuevo
  const [cambiarEstado, setCambiarEstado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  // debounce de 300 ms
  useEffect(() => { const t = setTimeout(() => setQ(buscar.trim()), 300); return () => clearTimeout(t); }, [buscar]);

  const cargar = useCallback(async () => {
    try { setError(null); setLista(await api.get(`/users${qs({ activo, q })}`)); }
    catch (e) { setError(e.message); setLista([]); }
  }, [activo, q]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardado = (u) => {
    avisar(editando ? `Se guardaron los cambios de ${u.nombre}.` : `Se creó el usuario ${u.nombre}.`);
    setEditando(undefined); cargar();
  };

  const confirmarEstado = async () => {
    const u = cambiarEstado;
    setOcupado(true);
    try {
      if (u.activo) await api.del(`/users/${u.id}`); else await api.put(`/users/${u.id}`, { activo: true });
      avisar(u.activo ? `${u.nombre} ya no puede iniciar sesión.` : `${u.nombre} puede volver a iniciar sesión.`);
      cargar();
    } catch (e) { avisar(e.message, 'error'); }
    finally { setOcupado(false); setCambiarEstado(null); }
  };

  const acciones = (u) => (
    <div className="flex gap-1 justify-end">
      <Boton variante="fantasma" className="h-9 px-3" onClick={() => setEditando(u)}>Editar</Boton>
      {u.id !== yo.id && (
        <Boton variante={u.activo ? 'fantasmaPeligro' : 'fantasma'} className="h-9 px-3" onClick={() => setCambiarEstado(u)}>
          {u.activo ? 'Desactivar' : 'Reactivar'}
        </Boton>
      )}
    </div>
  );
  const estado = (u) => <Insignia color={u.activo ? 'exito' : 'neutro'}>{u.activo ? 'Activo' : 'Inactivo'}</Insignia>;

  return (
    <>
      <Encabezado titulo="Usuarios" descripcion="Quién puede entrar al sistema y qué secciones usa cada quien.">
        <Boton onClick={() => setEditando(null)}>Nuevo usuario</Boton>
      </Encabezado>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="sr-only" htmlFor="buscar">Buscar por nombre o correo</label>
        <Entrada id="buscar" type="search" placeholder="Buscar por nombre o correo" value={buscar}
          onChange={(e) => setBuscar(e.target.value)} className="sm:max-w-xs" />
        <div role="group" aria-label="Estado" className="inline-flex rounded-full border border-linea bg-white p-1 self-start">
          {FILTROS.map(([v, t]) => (
            <button key={t} aria-pressed={activo === v} onClick={() => setActivo(v)}
              className={cx('rounded-full px-4 h-8 text-sm font-medium', activo === v ? 'bg-primario-600 text-white' : 'text-suave hover:text-primario-700')}>{t}</button>
          ))}
        </div>
      </div>

      <Aviso>{error}</Aviso>
      {lista === null ? <Cargando /> : !lista.length ? (
        <Vacio titulo={q ? `Nadie coincide con “${q}”.` : 'No hay usuarios en esta vista.'}>
          {q ? 'Revisa cómo está escrito o busca por correo.' : 'Usa “Nuevo usuario” para dar acceso a alguien.'}
        </Vacio>
      ) : (
        <div className="tarjeta overflow-hidden">
          <table className="hidden md:table w-full text-sm">
            <thead className="text-left text-suave border-b border-linea bg-primario-50/60">
              <tr><th className="px-5 py-3.5 font-medium">Nombre</th><th className="px-5 py-3.5 font-medium">Correo</th>
                <th className="px-5 py-3.5 font-medium">Rol</th><th className="px-5 py-3.5 font-medium">Estado</th><th className="px-5 py-3.5"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {lista.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'text-suave'}>
                  <td className="px-5 py-3.5 font-medium">{u.nombre}{u.id === yo.id && <span className="ml-2 text-xs text-suave font-normal">(tú)</span>}</td>
                  <td className="px-5 py-3.5">{u.email}</td>
                  <td className="px-5 py-3.5"><Insignia color={COLOR_ROL[u.rol]}>{ROLES[u.rol]}</Insignia></td>
                  <td className="px-5 py-3.5">{estado(u)}</td>
                  <td className="px-2 py-1.5">{acciones(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="md:hidden divide-y divide-linea">
            {lista.map((u) => (
              <li key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.nombre}{u.id === yo.id && <span className="ml-2 text-xs text-suave font-normal">(tú)</span>}</p>
                    <p className="text-sm text-suave truncate">{u.email}</p>
                  </div>
                  {estado(u)}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Insignia color={COLOR_ROL[u.rol]}>{ROLES[u.rol]}</Insignia>{acciones(u)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal abierto={editando !== undefined} alCerrar={() => setEditando(undefined)} titulo={editando ? `Editar a ${editando.nombre}` : 'Nuevo usuario'}>
        <UsuarioForm key={editando?.id ?? 'nuevo'} usuario={editando} esYo={editando?.id === yo.id} alGuardar={guardado} alCancelar={() => setEditando(undefined)} />
      </Modal>
      <Confirmar abierto={Boolean(cambiarEstado)} alCerrar={() => setCambiarEstado(null)} cargando={ocupado} alConfirmar={confirmarEstado}
        variante={cambiarEstado?.activo ? 'peligro' : 'primario'}
        titulo={cambiarEstado?.activo ? `¿Desactivar a ${cambiarEstado?.nombre}?` : `¿Reactivar a ${cambiarEstado?.nombre}?`}
        accion={cambiarEstado?.activo ? 'Desactivar' : 'Reactivar'}
        mensaje={cambiarEstado?.activo
          ? 'No podrá iniciar sesión y su sesión abierta se cierra. Sus pedidos anteriores se conservan.'
          : 'Podrá volver a iniciar sesión con su contraseña actual.'} />
    </>
  );
}
