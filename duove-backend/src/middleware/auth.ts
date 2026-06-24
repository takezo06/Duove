import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

// Extend Express Request to include our custom user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        [key: string]: any; // allow other fields from the JWT payload
      };
    }
  }
}

/**
 * Middleware to verify the user's JWT and attach the decoded user object to req.user.
 * Uses the SUPABASE_JWT_SECRET to verify the token.
 * If the token is invalid or missing, responds with 401 Unauthorized.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify the token using the Supabase JWT secret
    const secret = config.supabaseJwtSecret;
    if (!secret) {
      logger.error('SUPABASE_JWT_SECRET is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // 3. Decode and verify the token
    const decoded = jwt.verify(token, secret) as { sub: string; email?: string; [key: string]: any };

    // Supabase JWT typically has `sub` as the user ID.
    // If not, fallback to `id` or `user_id` – check your JWT structure.
    const userId = decoded.sub || decoded.id || decoded.user_id;
    if (!userId) {
      logger.warn('JWT missing user ID', { decoded });
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    // 4. Attach the user info to the request
    req.user = {
      id: userId,
      email: decoded.email,
      ...decoded, // keep any other claims if needed
    };

    // 5. Proceed
    next();
  } catch (error) {
    // Token verification failed
    logger.warn('JWT verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
