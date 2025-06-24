import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import alias from '@rollup/plugin-alias'
import { fileURLToPath, URL } from 'url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    alias({
      entries: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }
      ]
    })
  ],
  server: {
    proxy: {
      '^/api/.*': 'http://localhost:5001'
    }
  }
})
