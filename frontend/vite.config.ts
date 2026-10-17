import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
    build: {
    cssMinify: false,   // temporarily disable CSS minification
  },
  server: {
    allowedHosts: true // Allows localtunnel and VS Code dev tunnels to bypass host checks
  }
})
