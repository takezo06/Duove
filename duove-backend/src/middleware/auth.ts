import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
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

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      logger.error('Supabase URL or Anon Key missing');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Use the anon key to verify the token
    const supabase = createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      logger.warn('Token verification failed', { error: error?.message });
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
