import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, token, onSesionExpirada } from '../lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export const INICIO = { admin: '/mesas', mesero: '/mesas', cocina: '/cocina' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(Boolean(token.get()));
  const [expirada, setExpirada] = useState(false);

  const salir = useCallback(() => { token.set(null); setUser(null); }, []);

  useEffect(() => {
    onSesionExpirada(() => { setExpirada(true); salir(); });
    if (!token.get()) return;
    api.get('/auth/me').then(setUser).catch(salir).finally(() => setCargando(false));
  }, [salir]);

  const entrar = async (email, password) => {
    const { token: t, user: u } = await api.post('/auth/login', { email, password });
    token.set(t); setExpirada(false); setUser(u);
    return u;
  };

  return <Ctx.Provider value={{ user, cargando, expirada, entrar, salir }}>{children}</Ctx.Provider>;
}
