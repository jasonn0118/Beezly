import type { Config } from 'jest';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '.env.test'),
});

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleNameMapper: {
    '^@beezly/types$': '<rootDir>/../packages/types/dto/index.ts',
    '^@beezly/types/(.*)$': '<rootDir>/../packages/types/dto/$1',
  },
};

export default config;
