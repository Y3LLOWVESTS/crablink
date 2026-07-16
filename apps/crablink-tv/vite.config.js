import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  server: {
    host: '127.0.0.1',
    port: 1430,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 1430,
    strictPort: true,
  },
  build: {
    target: 'es2021',
    sourcemap: false,
  },
});
