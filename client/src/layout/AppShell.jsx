import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ChefHat, Boxes, LayoutGrid, LogOut, Menu, ScrollText, UtensilsCrossed, Users, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Marca } from '../components/Marca';
import { cx } from '../components/ui';

export const SECCIONES = [
  { ruta: '/mesas', texto: 'Mesas', icono: LayoutGrid, roles: ['admin', 'mesero'] },
  { ruta: '/cocina', texto: 'Cocina', icono: ChefHat, roles: ['admin', 'cocina'] },
  { ruta: '/inventario', texto: 'Inventario', icono: Boxes, roles: ['admin', 'cocina'] },
  { ruta: '/productos', texto: 'Productos', icono: UtensilsCrossed, roles: ['admin'] },
  { ruta: '/reportes', texto: 'Reportes', icono: ScrollText, roles: ['admin'] },
  { ruta: '/usuarios', texto: 'Usuarios', icono: Users, roles: ['admin'] },
];
const ROL = { admin: 'Administración', mesero: 'Mesero', cocina: 'Cocina' };
const iniciales = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function AppShell() {
  const { user, salir } = useAuth();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const visibles = SECCIONES.filter((s) => s.roles.includes(user.rol));
  // /pedidos/... cuenta como Mesas
  const enSeccion = (ruta) => pathname.startsWith(ruta) || (ruta === '/mesas' && pathname.startsWith('/pedidos'));
  const actual = visibles.find((s) => enSeccion(s.ruta));

  const nav = (
    <nav aria-label="Secciones" className="flex flex-col gap-1.5 p-4">
      {visibles.map(({ ruta, texto, icono: Icono }) => (
        <NavLink key={ruta} to={ruta} onClick={() => setMenu(false)}
          className={() => cx('group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition-colors',
            enSeccion(ruta) ? 'bg-primario-600 text-white shadow-md shadow-primario-600/25' : 'text-tinta/80 hover:bg-primario-50 hover:text-primario-700')}>
          {() => (<>
            <span className={cx('grid size-9 place-items-center rounded-xl', enSeccion(ruta) ? 'bg-white/20' : 'bg-primario-50 text-primario-600')}>
              <Icono className="size-[18px]" aria-hidden="true" />
            </span>
            {texto}
          </>)}
        </NavLink>
      ))}
    </nav>
  );

  const usuario = (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primario-100 text-sm font-semibold text-primario-700" aria-hidden="true">{iniciales(user.nombre)}</span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">{user.nombre}</p>
        <p className="text-xs text-suave">{ROL[user.rol]}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:flex flex-col bg-white border-r border-linea sticky top-0 h-dvh">
        <div className="flex h-20 items-center px-6 border-b border-linea"><Marca /></div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-linea">
          <div className="flex h-16 lg:h-20 items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="menu-movil" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
                className="grid size-10 place-items-center rounded-full bg-primario-50 text-primario-700">
                {menu ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
              <Marca compacta />
            </div>
            <p className="hidden lg:block text-sm text-suave">{actual?.texto}</p>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">{usuario}</div>
              <button onClick={salir} className="flex items-center gap-2 rounded-full px-3 h-10 text-sm font-medium text-suave hover:bg-primario-50 hover:text-primario-700">
                <LogOut className="size-4" aria-hidden="true" /><span>Salir</span>
              </button>
            </div>
          </div>
          {menu && (
            <div id="menu-movil" className="lg:hidden border-t border-linea bg-white">
              <div className="px-5 pt-4 sm:hidden">{usuario}</div>
              {nav}
            </div>
          )}
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8 max-w-6xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
