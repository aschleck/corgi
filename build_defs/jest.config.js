import * as process from 'node:process';
import * as util from 'node:util';

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  rootDir: process.cwd(),
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  globals: {
    // See https://github.com/jsdom/jsdom/issues/2524
    TextDecoder: util.TextDecoder,
    TextEncoder: util.TextEncoder,
  },
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
