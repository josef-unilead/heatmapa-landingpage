import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const apiProxy = {
  '/api': {
    target: `http://localhost:${process.env.DEV_API_PORT ?? 3001}`,
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: ['es2020', 'safari14'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Serverové funkce ze složky /api obsluhuje při vývoji scripts/dev-api.mjs.
  // Na Vercelu se to stane samo, lokálně je potřeba je někam přesměrovat.
  // Stejné přesměrování potřebuje i `vite preview`, protože jenom na
  // produkčním buildu jde otestovat offline režim vstupenky: ve vývoji jsou
  // soubory pod /src/, kdežto service worker cachuje /assets/.
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
