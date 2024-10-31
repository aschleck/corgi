require('process');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  rootDir: process.cwd(),
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  haste: {
    enableSymlinks: true,
  },
  moduleDirectories: [
    'node_modules',
  ],
  moduleNameMapper: {
    '^external/(.*)': '<rootDir>/../$1',
  },
};
