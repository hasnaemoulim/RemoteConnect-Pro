import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permet l'accès depuis d'autres appareils
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
