import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as usersRepo from '../modules/users/users.repository.js';

export const authenticate = async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) throw new AppError(401, 'Token requerido');
  let payload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Token inválido o expirado');
  }
  const user = await usersRepo.findById(payload.sub);       // si lo desactivan, pierde acceso aunque el token siga vigente
  if (!user || !user.activo) throw new AppError(401, 'Usuario no válido');
  req.user = user;
  next();
};

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.rol) ? next() : next(new AppError(403, 'No tienes permiso para esta acción'));
