import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` controls how the built index.html references its assets:
//   `/`                 → Vercel (canonical deploy) and local dev
//   `/Leasing-Tracker/` → GitHub Pages (deployed via .github/workflows/deploy.yml,
//                         which sets VITE_BASE_PATH explicitly)
//
// Hardcoding `/Leasing-Tracker/` here broke Vercel because the bundle then 404s
// at `/Leasing-Tracker/assets/...` when served at the root. Driving it through
// an env var keeps both deploys working.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
})
