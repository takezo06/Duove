let cyclesRouter: any;
try {
  cyclesRouter = require('./routes/cycles').default;
  app.use('/api/cycles', cyclesRouter);
  logger.info('Cycles router loaded successfully');
} catch (err: any) {
  logger.error('Failed to load cycles router', { error: err.message, stack: err.stack });
  // Optionally keep the server running without the cycles routes
}
