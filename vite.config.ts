import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Optional: set VITE_LAB_QUERY_API_URL to '' and use relative /lab-query when AarogyaAI runs on 8000
      '/lab-query': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
