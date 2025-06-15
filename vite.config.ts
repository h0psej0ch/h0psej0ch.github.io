import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  
  // Development server
  server: {
    port: 3000,
    open: true
  }
})
