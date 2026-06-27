import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import { startScheduler } from './services/scheduler';
import healthRouter from './routes/health';

// Import middleware (will be used later for protected routes)
// import { authMiddleware } from './middleware/auth';
// import { dailyLimitMiddleware } from './middleware/dailyLimit';

const app: Express = express();
const PORT = config.port;

// ========================
// Middleware
// ========================

// Security headers
app.use(helmet());

// CORS – restrict to frontend domain in production
app.use(cors({
  origin: config.nodeEnv === 'production' ? 'https://your-frontend.vercel.app' : '*',
  credentials: true,
}));

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));

// JSON body parsing
app.use(express.json({ limit: '10mb' })); // allow larger payloads for images

// ========================
// Routes
// ========================

// Health check – public
app.use('/health', healthRouter);

// Example of a protected route (we'll add later)
// app.use('/api/cravings', authMiddleware, dailyLimitMiddleware('qa'), cravingsRouter);

// ========================
// Error handling (catch-all)
// ========================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: 'Something went wrong' });
});

// ========================
// Start server
// ========================
const server = app.listen(PORT, () => {
  logger.info(`🚀 Duove backend running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`📅 Health check available at http://localhost:${PORT}/health`);
});

// Start the daily scheduler
startScheduler();

// ========================
// Graceful shutdown
// ========================
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds if not closed
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ========================
// Handle uncaught exceptions
// ========================
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  // Optionally, shut down or just log
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});
