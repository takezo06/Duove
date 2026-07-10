import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import healthRouter from './routes/health';

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

  // Health always works
  app.use('/health', healthRouter);

  // Safely mount all other routes
  const routeMap: Record<string, string> = {
    '/api/cravings': './routes/cravings',
    '/api/love-letters': './routes/letters',
    '/api/cycles': './routes/cycles',
    '/api/relationships': './routes/relationships',
    '/api/notifications': './routes/notifications',
    '/api/profile': './routes/profile',
    '/api/qa': './routes/qa',
  };

  for (const [path, modulePath] of Object.entries(routeMap)) {
    try {
      const router = require(modulePath).default;
      app.use(path, router);
      logger.info(`✅ Mounted ${path}`);
    } catch (err: any) {
      logger.error(`❌ Failed to mount ${path}`, { error: err.message, stack: err.stack });
    }
  }

  // Error handler
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
