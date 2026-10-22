import '@fontsource/poppins/700.css';
import { PlatoDibujo } from '../../components/Platos';

// Como los frames de error de Aprycot: un plato hace de dígito
export const Plato = ({ platillo }) => (
  <svg viewBox="-20 -20 240 260" className="w-[clamp(7rem,22vw,17rem)] shrink-0 overflow-visible" aria-hidden="true">
    <PlatoDibujo cx={100} cy={104} r={88} platillo={platillo} />
  </svg>
);

export default function PaginaError({ codigo, titulo, children, acciones, ilustracion }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-white bg-[radial-gradient(60%_50%_at_15%_10%,#FFF5EE_0%,transparent_70%),radial-gradient(55%_45%_at_90%_95%,#FFF8EA_0%,transparent_70%)]">
      <svg viewBox="0 0 1440 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-[18%] h-64 w-full" aria-hidden="true">
        <path d="M0 210 C 260 70, 520 90, 760 150 S 1200 230, 1440 110" fill="none" stroke="#EF9455" strokeWidth="1.2" opacity="0.45" />
        <path d="M0 250 C 300 120, 560 160, 820 190 S 1220 200, 1440 160" fill="none" stroke="#EF9455" strokeWidth="1.2" opacity="0.3" />
      </svg>
      {ilustracion}
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
        {codigo && (
          <div className="flex items-center justify-center gap-[clamp(0.25rem,1.5vw,1rem)] font-bold text-primario-600 leading-none text-[clamp(7rem,26vw,20rem)] tracking-tight" aria-hidden="true">
            {codigo}
          </div>
        )}
        <h1 className="titulo mt-8 text-3xl sm:text-[40px] leading-tight">{titulo}</h1>
        <p className="mt-4 max-w-xl text-base sm:text-lg text-suave">{children}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{acciones}</div>
      </div>
    </main>
  );
}
