import { config } from './config/env';
import { logger } from './config/logger';
import { createUserClient } from './config/supabase';
import { authMiddleware } from './middleware/auth';

logger.info('Hello from Duove backend!');
logger.debug(`Running on port ${config.port} in ${config.nodeEnv} mode`);

// ... rest of your test code, but remove the testClient call if you like
