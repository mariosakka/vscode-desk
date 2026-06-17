module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^vscode$': '<rootDir>/src/__mocks__/vscode.ts' },
  testMatch: ['**/src/**/*.test.ts'],
};
