import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // plugin base per il frontend
  plugins: [react(), tailwindcss()],
  
  resolve: {
    alias: {
      // comodo per gli import assoluti
      '@': path.resolve(__dirname, '.'),
    },
  },
  
  server: {
    // fisso la porta a 3000 per allinearmi al backend locale
    port: 3000,
    // hmr abilitato di default da vite
  },
});