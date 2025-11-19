import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all Tryton RPC endpoints to the backend
      '/tryton': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          const newPath = path.replace(/^\/tryton/, '');
          console.log('[Proxy Rewrite]', path, '->', newPath || '/');
          return newPath || '/';
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Proxy Request]', req.method, req.url, '->', proxyReq.path);
          });
        },
      },
    },
  },
})
