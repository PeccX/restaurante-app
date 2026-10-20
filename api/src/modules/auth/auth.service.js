import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import * as usersRepo from '../users/users.repository.js';

const DUMMY_HASH = bcrypt.hashSync('no-existe', 10);   // para tardar igual aunque el correo no exista

export const login = async ({ email, password }) => {
  const user = await usersRepo.findByEmail(email);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Correo o contraseña incorrectos');
  if (!user.activo) throw new AppError(403, 'Usuario inactivo');
  const token = jwt.sign({ rol: user.rol }, env.JWT_SECRET, { subject: String(user.id), expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' });
  const { password_hash, ...publico } = user;
  return { token, user: publico };
};
