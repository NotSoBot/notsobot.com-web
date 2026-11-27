import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';


// The tests' own config, not vite.config.ts: that one runs the worker in workerd and builds the site's two pages, none
// of which a unit test needs. Only the `@` alias is the same.
// Tests sit next to what they test (`src/**/x.test.ts`) and are type-checked with the app (`tsc -b`); nothing imports
// them, so they're in no bundle. happy-dom gives them `window`, timers and a document (the hooks render in one)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'happy-dom',
    // a test that fakes the clock or a global puts it back for the next one
    restoreMocks: true,
    unstubGlobals: true,
  },
});
