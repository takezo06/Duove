// `npm run preview:mock` serves the real app with Supabase and the backend replaced by ./mocks.
// Dev-only: the production build (vite.config.ts at the frontend root) never sees this folder.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, '../public'),
  plugins: [react()],
  // Never load the real .env; every backend call goes to mocks/axios.ts
  envDir: path.resolve(__dirname, 'mocks'),
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify('https://mock.local/functions/v1'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://mock.local'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('mock'),
  },
  resolve: {
    alias: [
      { find: /^(\.\.?\/)+lib\/supabase$/, replacement: path.resolve(__dirname, 'mocks/supabase.ts') },
      { find: /^axios$/, replacement: path.resolve(__dirname, 'mocks/axios.ts') },
    ],
  },
  server: { port: 5199, strictPort: true, fs: { allow: [path.resolve(__dirname, '..')] } },
});
