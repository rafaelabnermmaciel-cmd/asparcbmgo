import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Publicado no mesmo GitHub Pages do painel-nacional, sob /asparcbmgo/painel-captacao-app/
// (ver .github/workflows/publicar-painel-captacao.yml). Caminho relativo: os assets funcionam
// em qualquer subpasta, sem precisar saber o domínio final de antemão (mesma solução usada no
// vite.config.js da raiz deste repositório).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
