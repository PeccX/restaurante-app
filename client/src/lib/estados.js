export const ESTADOS = {
  pendiente: { texto: 'Pendiente', color: 'aviso' },
  en_preparacion: { texto: 'En preparación', color: 'primario' },
  entregado: { texto: 'Entregado', color: 'exito' },
  cancelado: { texto: 'Cancelado', color: 'neutro' },
};
export const estadoDe = (p) => (p.pagado ? { texto: 'Pagado', color: 'exito' } : ESTADOS[p.estado]);
export const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
