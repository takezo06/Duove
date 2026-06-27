import cron from 'node-cron';
import { logger } from '../config/logger';

/**
 * Starts the daily reminder scheduler.
 * Runs at 08:00 UTC every day.
 * Logs a friendly reminder to the console and Winston.
 */
export function startScheduler(): void {
  // Schedule: 0 8 * * * = every day at 08:00 UTC
  const task = cron.schedule('0 8 * * *', () => {
    const message = '🌅 Daily reminder: Take a moment to connect with your partner today!';
    logger.info(message);
    console.log(message); // also print to console for visibility
  });

  logger.info('Daily reminder scheduler started – will run at 08:00 UTC');
}
