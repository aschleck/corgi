import * as process from 'process';

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  rootDir: process.cwd(),
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  haste: {
    enableSymlinks: true,
  },
  moduleDirectories: [
    process.cwd(), // picks up generated files
    'node_modules',
  ],
  moduleNameMapper: {
    '^external/(.*)': '<rootDir>/../$1', // picks up references to external repositories
  },
};
