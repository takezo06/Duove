import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import healthRouter from './routes/health';
import cravingsRouter from './routes/cravings';
import lettersRouter from './routes/letters';
import qaRouter from './routes/qa';
import cyclesRouter from './routes/cycles';
import relationshipsRouter from './routes/relationships';
import notificationsRouter from './routes/notifications';
import profileRouter from './routes/profile';

export const createApp = (): Express => {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({
    origin: config.nodeEnv === 'production' ? 'https://your-frontend.vercel.app' : '*',
    credentials: true,
  }));

  // Logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));

  // Routes
  app.use('/health', healthRouter);

  app.use('/api/cravings', cravingsRouter);
  app.use('/api/letters', lettersRouter);
  app.use('/api/qa', qaRouter);
  app.use('/api/cycles', cyclesRouter);
  app.use('/api/relationships', relationshipsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/profile', profileRouter);

  // Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
};
