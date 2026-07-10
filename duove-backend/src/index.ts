import express from 'express';
import cors from 'cors';
import { logger } from './config/logger';

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, () => {
  logger.info(`✅ Minimal server running on port ${PORT}`);
  console.log('✅ Minimal server started');
});
