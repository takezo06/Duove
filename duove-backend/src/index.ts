import { config } from './config/env';
import { logger } from './config/logger';
import { createApp } from './app';

(async () => {
  try {
    const app = createApp();
    const PORT = config.port;

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Duove backend running on port ${PORT} in ${config.nodeEnv} mode`);
      logger.info(`📅 Health check available at http://localhost:${PORT}/health`);
    });

    // startScheduler();   // disabled for now

    const shutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
    });
  } catch (err) {
    console.error('Fatal error during startup:', err);
    process.exit(1);
  }
})();
