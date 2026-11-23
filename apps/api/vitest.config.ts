import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globalSetup: './tests/globalSetup.ts',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    fileParallelism: false,
  },
});
