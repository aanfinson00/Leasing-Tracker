import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: {
    alias: {
      buffer: 'buffer/',
      stream: 'stream-browserify',
    },
  },
  define: {
    global: 'globalThis',
  },
})
