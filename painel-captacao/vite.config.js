import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deploy próprio no Netlify (site separado do painel-nacional) — base na raiz do domínio,
// diferente do painel-nacional (que serve sob um subcaminho de GitHub Pages).
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
})
