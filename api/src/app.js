import './config/zod.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],               // para que el cliente lea el nombre de los PDF/Excel
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
