import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Returns basic health status for monitoring and zero‑downtime deployments.
 */
router.get('/health', (req: Request, res: Response) => {
  const uptime = process.uptime(); // seconds since process start
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
  });
});

export default router;
