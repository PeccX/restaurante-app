// En centavos; el último comensal absorbe el sobrante
export const dividirIguales = (total, n) => {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? cents - base * (n - 1) : base) / 100);
};
