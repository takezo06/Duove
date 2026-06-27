import { Router, Request, Response } from 'express';

const router = Router();

// GET /health – full path will be /health (since mounted at /health)
router.get('/', (req: Request, res: Response) => {
  const uptime = process.uptime();
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
  });
});

export default router;
