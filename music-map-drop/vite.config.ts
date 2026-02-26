import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA is configured via Vercel build (workbox breaks on iCloud paths locally)
// The manifest.webmanifest is served as a static file from public/

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
  },
})
