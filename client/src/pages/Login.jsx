import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth, INICIO } from '../auth/AuthContext';
import { Marca } from '../components/Marca';
import { Platos } from '../components/Platos';
import { Aviso, Boton, Campo, Entrada } from '../components/ui';
import { email, zodResolver } from '../lib/validacion';

const schema = z.object({ email, password: z.string().min(1, 'Escribe la contraseña').max(72) });

const MENSAJES = {
  401: 'El correo o la contraseña no coinciden.',
  403: 'Este usuario está desactivado. Pide a administración que lo reactive.',
  429: 'Demasiados intentos fallidos. Espera unos minutos y vuelve a intentar.',
};

export default function Login() {
  const { user, entrar, expirada } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [ver, setVer] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={INICIO[user.rol]} replace />;

  const enviar = async ({ email, password }) => {
    setError(null);
    try {
      const u = await entrar(email, password);
      navigate(INICIO[u.rol], { replace: true });
    } catch (e) {
      setError(MENSAJES[e.status] ?? e.message);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-gradient-to-br from-white via-primario-50 to-fondo overflow-hidden">
      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <Marca />
        <div className="flex flex-1 items-center py-10">
          <form onSubmit={handleSubmit(enviar)} noValidate className="w-full max-w-sm mx-auto lg:mx-0 flex flex-col gap-5">
            <div className="mb-2">
              <h1 className="titulo text-4xl sm:text-5xl leading-tight">Iniciar sesión</h1>
              <p className="mt-2 text-suave">Usa el correo que te dio administración.</p>
            </div>
            {expirada && !error && <Aviso tipo="info">Tu sesión expiró. Vuelve a entrar.</Aviso>}
            <Aviso>{error}</Aviso>
            <Campo label="Correo" id="email" error={errors.email?.message}>
              <Entrada id="email" type="email" autoComplete="username" autoFocus error={errors.email} {...register('email')} />
            </Campo>
            <Campo label="Contraseña" id="password" error={errors.password?.message}>
              <div className="relative">
                <Entrada id="password" type={ver ? 'text' : 'password'} autoComplete="current-password" className="pr-24" error={errors.password} {...register('password')} />
                <button type="button" onClick={() => setVer((v) => !v)} aria-pressed={ver}
                  className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-primario-700">{ver ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </Campo>
            <Boton type="submit" cargando={isSubmitting} className="mt-2 h-12 text-base">Entrar</Boton>
          </form>
        </div>
        <p className="text-xs text-suave">Quetzaltenango, Guatemala</p>
      </section>
      <div className="hidden lg:flex items-center justify-center p-10">
        <Platos className="w-full max-w-[620px]" />
      </div>
    </div>
  );
}
