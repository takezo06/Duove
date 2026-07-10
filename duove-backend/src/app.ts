// duove-backend/src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import healthRouter from './routes/health';

// All other route imports are done inside a try-catch to prevent crashes
const routeModules: Record<string, any> = {};

const mountRoutes = async () => {
  const routes = [
    { path: '/api/cravings', module: './routes/cravings' },
    { path: '/api/love-letters', module: './routes/letters' },
    { path: '/api/cycles', module: './routes/cycles' },
    { path: '/api/relationships', module: './routes/relationships' },
    { path: '/api/notifications', module: './routes/notifications' },
    { path: '/api/profile', module: './routes/profile' },
    { path: '/api/qa', module: './routes/qa' },
  ];

  for (const route of routes) {
    try {
      const router = (await import(route.module)).default;
      routeModules[route.path] = router;
      logger.info(`Successfully loaded ${route.module}`);
    } catch (err: any) {
      logger.error(`Failed to load ${route.module}`, { error: err.message, stack: err.stack });
    }
  }
};

// We'll mount routes in the createApp after they are loaded
export const createApp = (): Express => {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({
    origin: config.nodeEnv === 'production' ? (process.env.FRONTEND_URL || '*') : '*',
    credentials: true,
  }));

  // Logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }));

  // Body parsing
  app.use(express.json({ limit: '100kb' }));

  // Health check (always works)
  app.use('/health', healthRouter);

  // Mount routes that loaded successfully
  for (const [path, router] of Object.entries(routeModules)) {
    app.use(path, router);
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
    const message =
      config.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message || 'Something went wrong';

    res.status(status).json({ error: message });
  });

  return app;
};

// Pre-load routes before the app starts listening (called in index.ts)
export const initRoutes = async () => {
  await mountRoutes();
};
