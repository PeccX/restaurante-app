import { useId } from 'react';

export const PLATILLOS = {
  pepian: [['#8E3B1F', '#B8562A'], '#F3C35B'],
  guacamol: [['#5E8C2F', '#86B04A'], '#F4F1E4'],
  frijoles: [['#3B2420', '#5A3A31'], '#EFE6DA'],
  chirmol: [['#C9302C', '#E2543E'], '#F6E7B8'],
  tortillas: [['#E9B949', '#F3D27A'], '#C98A2B'],
  rellenitos: [['#D9822B', '#F0A04B'], '#7A3B12'],
};

const puntos = (cx, cy, r, color, n = 9) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + r, d = r * (0.25 + ((i * 37) % 10) / 22);
  return <circle key={i} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={r * 0.07} fill={color} opacity="0.9" />;
});

export function PlatoDibujo({ cx, cy, r, platillo = 'pepian' }) {
  const id = useId().replace(/[^\w-]/g, '');          // useId trae caracteres que rompen url(#...)
  const [[c1, c2], dot] = PLATILLOS[platillo];
  return (
    <g>
      <defs>
        <radialGradient id={`g${id}`}><stop offset="0" stopColor={c2} /><stop offset="1" stopColor={c1} /></radialGradient>
        <filter id={`s${id}`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy={r * 0.12} stdDeviation={r * 0.12} floodColor="#C4560B" floodOpacity="0.18" /></filter>
      </defs>
      <g filter={`url(#s${id})`}>
        <circle cx={cx} cy={cy} r={r} fill="#fff" />
        <circle cx={cx} cy={cy} r={r * 0.86} fill="#F6F1EC" />
        <circle cx={cx} cy={cy} r={r * 0.68} fill={`url(#g${id})`} />
        {puntos(cx, cy, r * 0.68, dot)}
      </g>
    </g>
  );
}

const LOGIN = [
  [300, 300, 118, 'pepian'], [118, 150, 58, 'guacamol'], [480, 120, 50, 'frijoles'],
  [520, 330, 62, 'chirmol'], [140, 450, 54, 'tortillas'], [430, 500, 46, 'rellenitos'],
];

export function Platos({ className }) {
  return (
    <svg viewBox="0 0 640 620" className={className} aria-hidden="true">
      <circle cx="300" cy="300" r="250" fill="none" stroke="#EF9455" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" opacity="0.7" />
      {LOGIN.map(([cx, cy, r, p]) => <PlatoDibujo key={p} cx={cx} cy={cy} r={r} platillo={p} />)}
    </svg>
  );
}
