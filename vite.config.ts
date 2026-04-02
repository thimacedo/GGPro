import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
          port: 24678,
          host: 'localhost'
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'Narrador Pro - Dashboard de Futebol',
            short_name: 'Narrador Pro',
            description: 'Painel Profissional para Transmissão de Futebol com IA Gemini',
            theme_color: '#0f172a',
            background_color: '#0f172a',
            display: 'standalone',
            orientation: 'landscape',
            icons: [
              {
                src: 'https://cdn-icons-png.flaticon.com/512/33/33736.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/33/33736.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.NEXT_RUNTIME': JSON.stringify('nodejs')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'next/navigation': path.resolve(__dirname, 'utils/empty.ts'),
          'next/headers': path.resolve(__dirname, 'utils/empty.ts'),
          'next/cache': path.resolve(__dirname, 'utils/empty.ts'),
        }
      },
      build: {
        rollupOptions: {
          external: ['next/navigation', 'next/headers', 'next/cache'],
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-charts': ['recharts']
            }
          }
        }
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react']
      }
    };
});
