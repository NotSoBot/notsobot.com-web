import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';


const LUCIDE_PATTERN = /node_modules[\\/]lucide-react[\\/]/;
// the Discord Activity's script (activity.html's entry)
const ACTIVITY_ENTRY = fileURLToPath(new URL('./src/activity.tsx', import.meta.url));
// lucide's barrel (`from 'lucide-react'`): `export { default as Coins, default as CoinsIcon, ... } from './icons/coins.mjs'`
const LUCIDE_BARREL = fileURLToPath(new URL('./node_modules/lucide-react/dist/esm/lucide-react.mjs', import.meta.url));
const LUCIDE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g;


type ModuleGraph = (moduleId: string) => {code: string | null, importedIds: ReadonlyArray<string>} | null;

// The icon files the Discord Activity's first load uses. They go in `icons-activity` instead of the site's
// `icons-initial`: one `$initial` group for every entry made the
// Activity preload icons only the site's first load uses, once the dashboard pages the Activity lazy loads moved some of
// the site's own icons into shared chunks.
// Every icon's importer is lucide's barrel (which everything imports), so the graph can't answer it from the icon's side:
// this walks an entry's static imports and reads which icons each of its own modules imports by name
function entryIconFiles(entry: string, getModuleInfo: ModuleGraph): Set<string> {
  const fileOf = new Map<string, string>();
  for (const [ , names, file ] of readFileSync(LUCIDE_BARREL, 'utf8').matchAll(/export \{([^}]*)\} from '\.\/icons\/([^']+)'/g)) {
    for (const [ , name ] of names.matchAll(/default as (\w+)/g)) {
      fileOf.set(name, file);
    }
  }
  const files = new Set<string>();
  const seen = new Set<string>([entry]);
  const queue = [entry];
  for (let moduleId = queue.pop(); moduleId !== undefined; moduleId = queue.pop()) {
    const info = getModuleInfo(moduleId);
    for (const [ , names ] of info?.code?.matchAll(LUCIDE_IMPORT) ?? []) {
      for (const name of names.split(',').map((part) => part.trim().split(/\s+as\s+/)[0])) {
        const file = fileOf.get(name);
        if (file) {
          files.add(file);
        }
      }
    }
    for (const imported of info?.importedIds ?? []) {
      if (!seen.has(imported) && !imported.includes('node_modules')) {
        seen.add(imported);
        queue.push(imported);
      }
    }
  }
  return files;
}


export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In development, `/api/*` is proxied so the browser only ever talks to one origin, exactly like production.
  // VITE_DEV_API_PROXY is an origin that serves the API under `/api` (a local nginx, or production if you really
  // mean to). Without it, requests go straight to a local notsobot.api (API_PORT in its .env.example) with the
  // `/api` prefix stripped like its nginx does, so dev never touches production by accident.
  const apiProxyTarget = env.VITE_DEV_API_PROXY || `http://localhost:${env.VITE_DEV_API_PORT || 8080}`;
  // `entryIconFiles`, worked out once per build (the module graph is complete by the time chunks are made)
  let activityIcons: Set<string> | null = null;
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
          // notsogames.com's games socket (`/api/games/socket`)
          ws: true,
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
      rolldownOptions: {
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
    // only the browser's build (on top of `build` above), the worker's chunks aren't fetched one by one
    environments: {
      client: {
        build: {
          rolldownOptions: {
            // the site, the Discord Activity's page (the worker serves it under /activity) and notsogames.com's (the worker
            // serves it for the games hosts)
            input: {
              main: fileURLToPath(new URL('./index.html', import.meta.url)),
              activity: fileURLToPath(new URL('./activity.html', import.meta.url)),
            },
            output: {
              // an icon more than one page uses was a chunk of its own, a third of all the chunks at a few hundred
              // bytes each. they're two files now: the ones the first load already needed (shared with the entry),
              // and the ones only lazy pages share, which the first load still doesn't fetch. an icon one page uses
              // stays in that page's chunk. the Activity's first load has its own (`entryIconFiles`), and so does
              // notsogames.com's (an icon both use is the Activity's), the site's first load fetches those too for the
              // icons they share
              codeSplitting: {
                groups: [
                  {
                    name: (moduleId, ctx) => {
                      activityIcons ??= entryIconFiles(ACTIVITY_ENTRY, (id) => ctx.getModuleInfo(id));
                      return (activityIcons.has(moduleId.split(/[\\/]/).pop() ?? '')) ? 'icons-activity' : null;
                    },
                    test: LUCIDE_PATTERN,
                    minShareCount: 2,
                    priority: 4,
                  },
                  {name: 'icons-initial', test: LUCIDE_PATTERN, tags: ['$initial'], minShareCount: 2, priority: 2},
                  {name: 'icons', test: LUCIDE_PATTERN, minShareCount: 2, priority: 1},
                ],
              },
            },
          },
        },
      },
    },
  };
});
