import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, token, onSesionExpirada } from '../lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export const INICIO = { admin: '/mesas', mesero: '/mesas', cocina: '/cocina' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(Boolean(token.get()));
  const [expirada, setExpirada] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);

  const salir = useCallback(() => { token.set(null); setUser(null); }, []);

  const revisar = useCallback(async () => {
    if (!token.get()) return setSinConexion(false);
    try { setUser(await api.get('/auth/me')); setSinConexion(false); }
    catch (e) { if (e.status === 0) setSinConexion(true); else salir(); }
    finally { setCargando(false); }
  }, [salir]);

  useEffect(() => {
    onSesionExpirada(() => { setExpirada(true); salir(); });
    revisar();
  }, [salir, revisar]);

  const entrar = async (email, password) => {
    const { token: t, user: u } = await api.post('/auth/login', { email, password });
    token.set(t); setExpirada(false); setUser(u);
    return u;
  };

  return <Ctx.Provider value={{ user, cargando, expirada, sinConexion, revisar, entrar, salir }}>{children}</Ctx.Provider>;
}
