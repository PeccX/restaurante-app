export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export const orNotFound = (value, what = 'Registro') => {
  if (!value) throw new AppError(404, `${what} no encontrado`);
  return value;
};
