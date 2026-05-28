import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { patchHTML } from './vite-plugin-html'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    patchHTML(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://aimarco.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  // File types to support raw imports.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  // Multiple entry points: app (onboarding) and booking (public)
  build: {
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'index.html'),
        booking: path.resolve(__dirname, 'public-booking.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
