import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import { email, erroresDelServidor, nombreTexto, password, zodResolver } from '../../lib/validacion';
import { Aviso, Boton, Campo, Entrada, Selector } from '../../components/ui';
import { useState } from 'react';

export const ROLES = { admin: 'Administración', mesero: 'Mesero', cocina: 'Cocina' };
const rol = z.enum(['admin', 'mesero', 'cocina']);
const crear = z.object({ nombre: nombreTexto, email, rol, password });
const editar = z.object({ nombre: nombreTexto, email, rol, password: z.union([z.literal(''), password]) });

export default function UsuarioForm({ usuario, esYo, alGuardar, alCancelar }) {
  const [error, setError] = useState(null);
  const { register, handleSubmit, setError: marcar, formState: { errors, isSubmitting, dirtyFields } } = useForm({
    resolver: zodResolver(usuario ? editar : crear),
    defaultValues: { nombre: usuario?.nombre ?? '', email: usuario?.email ?? '', rol: usuario?.rol ?? 'mesero', password: '' },
  });

  const enviar = async (datos) => {
    setError(null);
    // al editar solo se mandan los campos modificados
    const cuerpo = usuario
      ? Object.fromEntries(Object.entries(datos).filter(([k, v]) => dirtyFields[k] && !(k === 'password' && v === '')))
      : datos;
    if (usuario && !Object.keys(cuerpo).length) return alCancelar();
    try {
      const guardado = usuario ? await api.put(`/users/${usuario.id}`, cuerpo) : await api.post('/users', cuerpo);
      alGuardar(guardado);
    } catch (e) {
      setError(erroresDelServidor(e, marcar, ['nombre', 'email', 'rol', 'password']));
    }
  };

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
      <Aviso>{error}</Aviso>
      <Campo label="Nombre completo" id="nombre" error={errors.nombre?.message}>
        <Entrada id="nombre" autoComplete="off" error={errors.nombre} {...register('nombre')} />
      </Campo>
      <Campo label="Correo" id="email" error={errors.email?.message} ayuda="Con este correo inicia sesión.">
        <Entrada id="email" type="email" autoComplete="off" error={errors.email} {...register('email')} />
      </Campo>
      <Campo label="Rol" id="rol" error={errors.rol?.message} ayuda={esYo ? 'No puedes cambiar tu propio rol.' : 'Define qué secciones puede usar.'}>
        <Selector id="rol" disabled={esYo} error={errors.rol} {...register('rol')}>
          {Object.entries(ROLES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </Selector>
      </Campo>
      <Campo label={usuario ? 'Nueva contraseña' : 'Contraseña'} id="password" error={errors.password?.message}
        ayuda={usuario ? 'Déjala vacía para no cambiarla.' : 'Mínimo 8 caracteres, con al menos una letra y un número.'}>
        <Entrada id="password" type="password" autoComplete="new-password" error={errors.password} {...register('password')} />
      </Campo>
      <div className="mt-2 flex justify-end gap-2">
        <Boton type="button" variante="secundario" onClick={alCancelar}>Cancelar</Boton>
        <Boton type="submit" cargando={isSubmitting}>{usuario ? 'Guardar cambios' : 'Crear usuario'}</Boton>
      </div>
    </form>
  );
}
