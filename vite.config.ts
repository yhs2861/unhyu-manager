import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/unhyu-manager/',
  plugins: [react()],
  resolve: {
    preserveSymlinks: true
  }
});
