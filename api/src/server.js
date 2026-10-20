import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(env.PORT, () => console.log(`API escuchando en el puerto ${env.PORT}`));

// Cierre ordenado (docker stop envía SIGTERM)
const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
