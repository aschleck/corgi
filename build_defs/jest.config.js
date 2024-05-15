require('process');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  haste: {
    enableSymlinks: true,
  },
  moduleDirectories: [
    process.cwd(),
    'node_modules',
  ],
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest', {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};
