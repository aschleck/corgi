require('process');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  haste: {
    enableSymlinks: true,
  },
  moduleDirectories: [
    process.cwd(),
    'node_modules',
  ],
};
