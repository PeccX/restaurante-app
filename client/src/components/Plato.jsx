import { CupSoda, Drumstick, IceCreamCone, Salad } from 'lucide-react';
import { cx } from './ui';

export const CATEGORIAS = {
  platillo: { texto: 'Platillos', icono: Drumstick, fondo: 'from-[#F7C59F] to-[#EF9455]' },
  entrada: { texto: 'Entradas', icono: Salad, fondo: 'from-[#D9EAB8] to-[#9CC46B]' },
  bebida: { texto: 'Bebidas', icono: CupSoda, fondo: 'from-[#FBD9D3] to-[#F0937F]' },
  postre: { texto: 'Postres', icono: IceCreamCone, fondo: 'from-[#FCE7B2] to-[#F2C24F]' },
};

const TAM = { sm: ['size-12 p-1', 'size-5'], md: ['size-16 p-1.5', 'size-7'], lg: ['size-28 p-2.5', 'size-11'] };

export function Plato({ categoria = 'platillo', tam = 'md', className }) {
  const { icono: Icono, fondo } = CATEGORIAS[categoria] ?? CATEGORIAS.platillo;
  const [caja, icono] = TAM[tam];
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full bg-white shadow-[0_12px_24px_-10px_rgb(234_106_18/0.45)]', caja, className)} aria-hidden="true">
      <span className={cx('grid size-full place-items-center rounded-full bg-gradient-to-br text-white', fondo)}>
        <Icono className={icono} strokeWidth={1.75} />
      </span>
    </span>
  );
}
