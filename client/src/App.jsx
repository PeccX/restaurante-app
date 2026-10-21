import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth, INICIO } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { Cargando } from './components/ui';
import AppShell from './layout/AppShell';
import Login from './pages/Login';
import Usuarios from './pages/usuarios/Usuarios';
import Pendiente from './pages/Pendiente';
import Mesas from './pages/mesas/Mesas';
import MesaDetalle from './pages/mesas/MesaDetalle';
import PedidoEditor from './pages/pedidos/PedidoEditor';
import PedidoDetalle from './pages/pedidos/PedidoDetalle';

const MESA = ['admin', 'mesero'];

function Protegida({ roles, children }) {
  const { user, cargando } = useAuth();
  if (cargando) return <Cargando texto="Revisando tu sesión…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to={INICIO[user.rol]} replace />;
  return children;
}

function Inicio() {
  const { user } = useAuth();
  return <Navigate to={user ? INICIO[user.rol] : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protegida><AppShell /></Protegida>}>
              <Route path="/mesas" element={<Protegida roles={MESA}><Mesas /></Protegida>} />
              <Route path="/mesas/:id" element={<Protegida roles={MESA}><MesaDetalle /></Protegida>} />
              <Route path="/mesas/:id/nuevo" element={<Protegida roles={MESA}><PedidoEditor /></Protegida>} />
              <Route path="/pedidos/:pedidoId" element={<PedidoDetalle />} />
              <Route path="/pedidos/:pedidoId/editar" element={<Protegida roles={MESA}><PedidoEditor /></Protegida>} />
              <Route path="/cocina" element={<Protegida roles={['admin', 'cocina']}><Pendiente titulo="Cocina" /></Protegida>} />
              <Route path="/inventario" element={<Protegida roles={['admin', 'cocina']}><Pendiente titulo="Inventario" /></Protegida>} />
              <Route path="/productos" element={<Protegida roles={['admin']}><Pendiente titulo="Productos" /></Protegida>} />
              <Route path="/reportes" element={<Protegida roles={['admin']}><Pendiente titulo="Reportes" /></Protegida>} />
              <Route path="/usuarios" element={<Protegida roles={['admin']}><Usuarios /></Protegida>} />
            </Route>
            <Route path="*" element={<Inicio />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
