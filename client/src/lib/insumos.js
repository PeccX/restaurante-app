import { z } from 'zod';
import { nombreTexto } from './validacion';

export const UNIDADES = { g: 'Gramos (g)', ml: 'Mililitros (ml)', unidad: 'Unidades' };
export const SUFIJO = { g: 'g', ml: 'ml', unidad: 'u' };
export const EJEMPLO = { g: 'Ej. 5 kg = 5000 g', ml: 'Ej. 2 litros = 2000 ml', unidad: 'Ej. 30 tortillas = 30' };

// Mismas reglas que insumos.schema.js; vacío cuenta como 0
export const cantidadInsumo = z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)),
  z.number({ invalid_type_error: 'Debe ser número' }).min(0, 'No puede ser negativo').max(10_000_000, 'Máximo 10,000,000'));
export const insumoSchema = z.object({ nombre: nombreTexto, unidad: z.enum(['g', 'ml', 'unidad']), stock: cantidadInsumo, stock_minimo: cantidadInsumo });

export const cantidad = (n, unidad) => `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 })} ${SUFIJO[unidad]}`;
export const nivel = (i) => (Number(i.stock) <= 0 ? 'agotado' : Number(i.stock) <= Number(i.stock_minimo) ? 'bajo' : 'ok');
