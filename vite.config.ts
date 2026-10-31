import { fileURLToPath } from 'node:url';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';


export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In development, `/api/*` is proxied so the browser only ever talks to one origin, exactly like production.
  // VITE_DEV_API_PROXY is an origin that serves the API under `/api` (a local nginx, or production if you really
  // mean to). Without it, requests go straight to a local notsobot.api (API_PORT in its .env.example) with the
  // `/api` prefix stripped like its nginx does, so dev never touches production by accident.
  const apiProxyTarget = env.VITE_DEV_API_PROXY || `http://localhost:${env.VITE_DEV_API_PORT || 8080}`;
  const stripApiPrefix = !env.VITE_DEV_API_PROXY;

  return {
    // cloudflare() builds worker/index.ts (wrangler.jsonc's `main`) with this same config, so the worker can import
    // anything the app does (the `@` alias, css, assets), and `vite dev`/`vite preview` run it in workerd in front of
    // the app. the app lands in dist/client (the static assets) and the worker in dist/notsobot_com_web
    plugins: [
      react(),
      tailwindcss(),
      cloudflare({
        // the worker gets requests before vite's own middleware, so in dev vite's module paths (`/@vite/client`,
        // `/@react-refresh` have no extension, the worker would take them for pages) and `/api` skip it, the latter
        // to reach the proxy below. production never sends `/api` to the worker either, the zone has a no-worker
        // route for it (see the readme)
        config: (command === 'serve') ? (worker) => {
          const runWorkerFirst = worker.assets?.run_worker_first;
          if (Array.isArray(runWorkerFirst)) {
            runWorkerFirst.push('!/@*', '!/src/*', '!/node_modules/*', '!/api', '!/api/*');
          }
        } : undefined,
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (stripApiPrefix) ? (path) => path.replace(/^\/api(?=[/?]|$)/, '').replace(/^(?!\/)/, '/') : undefined,
        },
      },
    },
    build: {
      outDir: 'dist',
      // nothing uploads source maps (no Sentry etc.), so don't publish the original source with the site
      sourcemap: false,
      // the smallest font subsets would be inlined as data: urls, which the worker's `font-src 'self'` doesn't allow
      assetsInlineLimit: (file) => (file.endsWith('.woff2')) ? false : undefined,
      rollupOptions: {
        output: {
          // the hover logo effects ship as `effect.<hash>.webp` so their filenames don't give away the command names
          assetFileNames: (asset) => {
            if (asset.originalFileNames.some((name) => name.startsWith('src/assets/logos/effects/'))) {
              return 'assets/effect.[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
  };
});
