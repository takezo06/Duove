import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import healthRouter from './routes/health';

// import cravingsRouter from './routes/cravings';
// import lettersRouter from './routes/letters';
// import cyclesRouter from './routes/cycles';
import cyclesRouter from './routes/cycles';
// import relationshipsRouter from './routes/relationships';
// import notificationsRouter from './routes/notifications';
// import profileRouter from './routes/profile';
// import qaRouter from './routes/qa';

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.nodeEnv === 'production' ? (process.env.FRONTEND_URL || '*') : '*',
    credentials: true,
  }));

  app.use(morgan('combined', {
    stream: { write: (message: string) => logger.http(message.trim()) },
  }));

  app.use(express.json({ limit: '100kb' }));

  // Only health route for now
  app.use('/health', healthRouter);

  app.use('/api/cycles', cyclesRouter);

  // Error handler remains
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });
    const status = err.status || 500;
    const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message || 'Something went wrong';
    res.status(status).json({ error: message });
  });

  return app;
};
