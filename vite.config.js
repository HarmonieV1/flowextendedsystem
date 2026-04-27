import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('wagmi') || id.includes('viem') || id.includes('@wagmi')) return 'wallet'
            if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor'
            if (id.includes('zustand') || id.includes('@tanstack')) return 'state'
          }
        },
      },
    },
  },
})
