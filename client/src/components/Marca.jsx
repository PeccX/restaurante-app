export const Marca = ({ compacta = false }) => (
  <div className="flex items-center gap-3">
    <span className="grid size-11 place-items-center rounded-full bg-primario-100 titulo text-2xl text-primario-700" aria-hidden="true">S</span>
    {!compacta && <span className="titulo text-xl leading-none">Sabor<br /><span className="text-primario-600">Chapín</span></span>}
  </div>
);
