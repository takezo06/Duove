import { Router, Request, Response, NextFunction } from 'express';
const router = Router();

// Temporary stub – does nothing but keep the app alive
router.get('/stats', (req: Request, res: Response) => {
  res.json({ prediction: null, calendar: [], lastPeriodStart: null });
});

export default router;
