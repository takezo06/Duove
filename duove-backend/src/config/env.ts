import dotenv from 'dotenv';
import path from 'path';

try {
  dotenv.config();
} catch (err) {
  console.warn('Could not load .env file, using system environment variables');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '', // Must be set in .env
};
