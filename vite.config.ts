import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works at any address, including
  // GitHub Pages' /kart-night/ sub-path.
  base: './',
})
