import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  databaseUrl: process.env.DATABASE_URL || '', // <-- NEW
};
// Optional: validate that critical variables are set
if (!config.supabaseUrl || !config.supabaseJwtSecret) {
  console.warn('⚠️  Missing SUPABASE_URL or SUPABASE_JWT_SECRET in .env');
}
