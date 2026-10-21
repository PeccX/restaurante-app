import { useCallback, useEffect, useRef, useState } from 'react';

// cada: ms entre recargas. Mientras recarga se siguen mostrando los datos anteriores
export function useDatos(cargar, deps = [], { cada } = {}) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const vivo = useRef(true);
  const recargar = useCallback(async () => {
    try { const d = await cargar(); if (vivo.current) { setDatos(d); setError(null); } }
    catch (e) { if (vivo.current) setError(e); }
  }, deps);
  useEffect(() => {
    vivo.current = true;
    recargar();
    const t = cada && setInterval(() => document.visibilityState === 'visible' && recargar(), cada);
    return () => { vivo.current = false; clearInterval(t); };
  }, [recargar, cada]);
  return { datos, error, recargar, setDatos };
}
