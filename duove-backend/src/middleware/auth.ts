import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        [key: string]: any;
      };
      token?: string; // <-- NEW: store raw JWT for reuse
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const secret = config.supabaseJwtSecret;
    if (!secret) {
      logger.error('SUPABASE_JWT_SECRET is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, secret) as { sub: string; email?: string; [key: string]: any };

    const userId = decoded.sub || decoded.id || decoded.user_id;
    if (!userId) {
      logger.warn('JWT missing user ID', { decoded });
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    // Attach user info AND the raw token
    req.user = {
      id: userId,
      email: decoded.email,
      ...decoded,
    };
    req.token = token; // <-- NEW

    next();
  } catch (error) {
    logger.warn('JWT verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
