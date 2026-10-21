export const quetzales = (n) => `Q ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dos = (n) => String(n).padStart(2, '0');
export const hora = (d) => { const f = new Date(d); return `${dos(f.getHours())}:${dos(f.getMinutes())}`; };
export const fechaHora = (d) => { const f = new Date(d); return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${hora(f)}`; };
export const hace = (d) => {
  const min = Math.round((Date.now() - new Date(d)) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h ${min % 60} min`;
};

// En centavos, igual que la API
export const sumar = (lineas) => lineas.reduce((s, l) => s + Math.round(l.precio * 100) * l.cantidad, 0) / 100;
