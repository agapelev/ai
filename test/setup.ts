import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

beforeAll(() => {
  console.log('Starting tests...');
});

afterAll(() => {
  console.log('Tests completed.');
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});
