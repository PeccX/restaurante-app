import { z } from 'zod';

// Mensajes en español por defecto
const tipos = { string: 'texto', number: 'número', boolean: 'verdadero/falso', array: 'lista', object: 'objeto' };

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: issue.received === 'undefined' ? 'Es obligatorio' : `Debe ser ${tipos[issue.expected] ?? issue.expected}` };
    case 'too_small':
      return { message: issue.type === 'string'
        ? (issue.minimum === 1 ? 'No puede estar vacío' : `Mínimo ${issue.minimum} caracteres`)
        : `Debe ser mayor o igual a ${issue.minimum}` };
    case 'too_big':
      return { message: issue.type === 'string' ? `Máximo ${issue.maximum} caracteres` : `Debe ser menor o igual a ${issue.maximum}` };
    case 'invalid_string':
      return { message: issue.validation === 'email' ? 'Correo inválido' : 'Formato inválido' };
    case 'invalid_enum_value':
      return { message: `Valor no permitido. Opciones: ${issue.options.join(', ')}` };
    case 'unrecognized_keys':
      return { message: `Campos no permitidos: ${issue.keys.join(', ')}` };
    default:
      return { message: ctx.defaultError };
  }
});
