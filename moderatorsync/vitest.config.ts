import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/server/core/__tests__/**/*.test.ts'],
  },
  // Keep Vite config minimal for tests to avoid loading devvit/vite plugins
  plugins: [],
});
