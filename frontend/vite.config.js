import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }

          if (/[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-router'
          }

          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) {
            return 'vendor-motion'
          }

          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+)[\\/]/.test(id)) {
            return 'vendor-charts'
          }

          if (/[\\/]node_modules[\\/]fabric[\\/]/.test(id)) {
            return 'vendor-fabric'
          }

          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
            return 'vendor-icons'
          }

          return undefined
        },
      },
    },
  },
})
