import { Link } from 'react-router';
import { useAuth, INICIO } from '../../auth/AuthContext';
import PaginaError, { Plato } from './PaginaError';

export default function NoEncontrada() {
  const { user } = useAuth();
  return (
    <PaginaError codigo={<>4<Plato platillo="pepian" />4</>} titulo="No encontramos esta página"
      acciones={<Link to={user ? INICIO[user.rol] : '/login'} className="inline-flex h-11 items-center rounded-full bg-primario-600 px-6 text-white hover:bg-primario-700">Volver al inicio</Link>}>
      La dirección no existe o cambió. Revisa el enlace o vuelve al inicio.
    </PaginaError>
  );
}
