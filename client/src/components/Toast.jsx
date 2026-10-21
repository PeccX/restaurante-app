import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [lista, setLista] = useState([]);
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random();
    setLista((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tipo === 'error' ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96">
        {lista.map((t) => (
          <div key={t.id} role={t.tipo === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl px-5 py-3.5 text-sm font-medium shadow-lg ${t.tipo === 'error' ? 'bg-peligro-600 text-white' : 'bg-tinta text-white'}`}>
            {t.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
