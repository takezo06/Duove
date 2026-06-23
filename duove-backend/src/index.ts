import { config } from './config/env';
import { logger } from './config/logger';

logger.info('Hello from Duove backend!');
logger.debug(`Running on port ${config.port} in ${config.nodeEnv} mode`);

logger.error('This is an error message');
