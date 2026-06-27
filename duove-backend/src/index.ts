import { config } from './config/env';
import { logger } from './config/logger';
import { startScheduler } from './services/scheduler';

// Start the scheduler
startScheduler();

// Basic server startup message
logger.info(`🚀 Duove backend is running in ${config.nodeEnv} mode`);
logger.info(`📅 Scheduler will run daily at 08:00 UTC`);

// (We'll add Express server later in Task 12 – for now just keep it minimal)
