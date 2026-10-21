import { Link, useParams } from 'react-router';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { hace, quetzales } from '../../lib/formato';
import { estadoDe } from '../../lib/estados';
import { useDatos } from '../../lib/useDatos';
import { Aviso, Boton, Cargando, Encabezado, Insignia, Vacio } from '../../components/ui';
import { useNavigate } from 'react-router';

export default function MesaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { datos, error } = useDatos(async () => {
    const [mesa, pedidos] = await Promise.all([api.get(`/mesas/${id}`), api.get(`/pedidos?mesa_id=${id}&sin_pagar=true`)]);
    return { mesa, pedidos };
  }, [id], { cada: 15000 });

  if (!datos) return error ? <Aviso>{error.status === 404 ? 'Esa mesa no existe.' : error.message}</Aviso> : <Cargando />;
  const { mesa, pedidos } = datos;
  const total = pedidos.reduce((s, p) => s + Math.round(p.total * 100), 0) / 100;

  return (
    <>
      <Link to="/mesas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primario-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />Mesas
      </Link>
      <Encabezado titulo={`Mesa ${mesa.numero}`} descripcion={`Capacidad para ${mesa.capacidad} personas.`}>
        <Boton onClick={() => navigate(`/mesas/${mesa.id}/nuevo`)}>Nuevo pedido</Boton>
      </Encabezado>

      {!pedidos.length ? (
        <Vacio titulo="La mesa no tiene cuentas pendientes.">Usa “Nuevo pedido” cuando lleguen los clientes.</Vacio>
      ) : (
        <div className="tarjeta p-4 sm:p-6">
          <div className="flex items-baseline justify-between px-2 pb-4">
            <h2 className="titulo text-[23px]">Cuentas sin pagar</h2>
            <p className="text-sm text-suave">Total <span className="ml-1 font-semibold text-tinta cifras">{quetzales(total)}</span></p>
          </div>
          <ul className="flex flex-col gap-3">
            {pedidos.map((p) => {
              const e = estadoDe(p);
              return (
                <li key={p.id}>
                  <Link to={`/pedidos/${p.id}`} className="flex items-center gap-4 rounded-full bg-primario-50 py-3 pl-6 pr-4 hover:bg-primario-100 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Pedido #{p.id}</p>
                      <p className="text-sm text-suave">{p.num_comensales} {p.num_comensales === 1 ? 'comensal' : 'comensales'}, {hace(p.creado_en)}</p>
                    </div>
                    <Insignia color={e.color}>{e.texto}</Insignia>
                    <span className="hidden sm:block w-28 text-right font-semibold cifras">{quetzales(p.total)}</span>
                    <ChevronRight className="size-5 text-primario-600" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
