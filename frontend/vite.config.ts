import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // path 모듈을 import 합니다.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000', // FastAPI 게이트웨이 주소
    },
  },
});