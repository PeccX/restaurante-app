// En centavos, redondeando al más cercano; el último comensal ajusta la diferencia (puede ser de más o de menos)
export const dividirIguales = (total, n) => {
  const cents = Math.round(total * 100);
  const base = Math.round(cents / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? cents - base * (n - 1) : base) / 100);
};
