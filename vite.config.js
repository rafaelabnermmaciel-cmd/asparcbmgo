import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Caminho relativo: permite hospedar em qualquer subpasta (ex: GitHub Pages em
  // /asparcbmgo/painel-nacional-app/) sem precisar saber o domínio final de antemão.
  base: './',
})
