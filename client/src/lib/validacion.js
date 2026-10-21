import { z } from 'zod';

// Mismos mensajes que la API
const tipos = { string: 'texto', number: 'número', boolean: 'verdadero/falso', array: 'lista' };
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: ['undefined', 'nan', 'null'].includes(issue.received) ? 'Es obligatorio' : `Debe ser ${tipos[issue.expected] ?? issue.expected}` };
    case 'too_small':
      return { message: issue.type === 'string'
        ? (issue.minimum === 1 ? 'No puede estar vacío' : `Mínimo ${issue.minimum} caracteres`)
        : issue.type === 'array' ? `Agrega al menos ${issue.minimum}` : `Debe ser mayor o igual a ${issue.minimum}` };
    case 'too_big':
      return { message: issue.type === 'string' ? `Máximo ${issue.maximum} caracteres` : `Debe ser menor o igual a ${issue.maximum}` };
    case 'invalid_string':
      return { message: issue.validation === 'email' ? 'Correo inválido' : 'Formato inválido' };
    case 'invalid_enum_value':
      return { message: 'Elige una opción de la lista' };
    default:
      return { message: ctx.defaultError };
  }
});

// Resolver de Zod para react-hook-form (sin @hookform/resolvers)
export const zodResolver = (schema) => async (values) => {
  const r = await schema.safeParseAsync(values);
  if (r.success) return { values: r.data, errors: {} };
  const errors = {};
  for (const i of r.error.issues) {
    const ruta = i.path.length ? i.path : ['root'];
    let nodo = errors;
    ruta.slice(0, -1).forEach((k) => { nodo = nodo[k] ??= {}; });
    nodo[ruta.at(-1)] ??= { type: i.code, message: i.message };
  }
  return { values: {}, errors };
};

// Devuelve el texto de los errores que no corresponden a ningún campo
export const erroresDelServidor = (err, setError, campos) => {
  const sueltos = [];
  for (const d of err.details ?? []) {
    if (campos.includes(d.campo)) setError(d.campo, { type: 'server', message: d.mensaje });
    else sueltos.push(d.mensaje);
  }
  return err.details?.length && !sueltos.length ? null : [err.message, ...sueltos].join('. ');
};

export const nombreTexto = z.string().trim().min(2).max(100).regex(/\p{L}/u, 'Debe contener al menos una letra');
export const email = z.string().trim().toLowerCase().min(1, 'Escribe el correo').email().max(150);
export const password = z.string().min(8).max(72)
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra').regex(/\d/, 'Debe incluir al menos un número');
// '' -> undefined, así el error es "Es obligatorio"
export const numero = (s) => z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), s);
