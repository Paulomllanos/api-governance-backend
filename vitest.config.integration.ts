
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    globals: true,
    environment: 'node',

    include: ['test/**/*.integration-spec.ts'],

    fileParallelism: false,
    maxWorkers: 1,

    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
