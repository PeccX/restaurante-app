import { AppError } from '../utils/AppError.js';

// Deja los datos validados en req.valid
export const validate = (schemas) => (req, _res, next) => {
  const valid = {};
  const details = [];
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) valid[part] = result.data;
    else details.push(...result.error.issues.map((i) => ({ campo: i.path.join('.') || part, mensaje: i.message })));
  }
  if (details.length) return next(new AppError(400, 'Datos inválidos', details));
  req.valid = valid;
  next();
};
