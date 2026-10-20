import { AppError } from '../utils/AppError.js';

// errno de MariaDB -> respuesta HTTP
const dbErrors = {
  1062: [409, 'Ya existe un registro con esos datos'],
  1451: [409, 'No se puede eliminar: tiene registros relacionados'],
  1452: [400, 'Referencia a un registro que no existe'],
  1213: [503, 'El sistema está ocupado, intenta de nuevo'],
  4025: [400, 'Un dato no cumple las restricciones'],
  3819: [400, 'Un dato no cumple las restricciones'],
};

export const notFound = (req, _res, next) => next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es un JSON válido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El cuerpo es demasiado grande' });
  if (dbErrors[err.errno]) return res.status(dbErrors[err.errno][0]).json({ error: dbErrors[err.errno][1] });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
