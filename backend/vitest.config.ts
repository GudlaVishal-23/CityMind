import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Vitest suites for Unit (Day 7), API Boundary (Day 8), Security (Day 8), Integration (Day 9), and Performance (Day 9)
    // Legacy Day 2-6 tests under src/**/__tests__/ use node:test API — run via test:legacy
    include: [
      'tests/unit/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/performance/**/*.test.ts'
    ],
    exclude: ['node_modules', 'dist'],
    env: {
      NODE_ENV: 'test',
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
