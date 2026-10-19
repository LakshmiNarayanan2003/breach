import { defineConfig } from 'vitest/config';
export default defineConfig({
  base: '/breach/',
  test: { include: ['tests/unit/**/*.test.ts'] },
  build: { chunkSizeWarningLimit: 650 },
});
