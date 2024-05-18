import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import glsl from 'vite-plugin-glsl';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), glsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    exclude: ['uirenderer-canvas']
  },
  define: {
    // disable hydration mismatch details in production build
    // Suppresses warning when using chartjs
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  }
})
