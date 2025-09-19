module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/**/index.ts',
  ],

  // Coverage thresholds aligned with London School TDD principles
  coverageThreshold: {
    global: {
      branches: 85,    // Focus on behavior paths
      functions: 90,   // All functions should be tested
      lines: 85,       // Good line coverage without obsessing over state
      statements: 85   // Statement coverage for reliability
    },
    // Critical agent components require higher coverage
    'src/agents/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    // Security components must have comprehensive coverage
    'src/security/': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },

  // Coverage reporting
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],

  coverageDirectory: '<rootDir>/coverage',

  // Test setup
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Test timeout (important for integration tests)
  testTimeout: 30000,

  // Globals for test environment
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }
  },

  // Test patterns for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testTimeout: 10000,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 30000,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      testTimeout: 60000,
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testTimeout: 120000,
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      testTimeout: 45000,
    }
  ],

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // File extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.venv/',
    '/venv/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(test-.*\\.js)$)'
  ],

  // Verbose output for debugging
  verbose: false,

  // Silent mode (set to false for debugging)
  silent: false,

  // Bail configuration (stop on first failure in CI)
  bail: process.env.CI ? 1 : 0,

  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
        suiteName: 'Zetify Email Triage Tests'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'test-report.html',
        expand: true
      }
    ]
  ],

  // Environment variables for tests
  setupFiles: [
    '<rootDir>/tests/env.setup.js'
  ],

  // London School TDD specific configuration
  testResultsProcessor: '<rootDir>/tests/london-school-processor.js',

  // Custom matchers for behavior verification
  snapshotSerializers: [
    '<rootDir>/tests/serializers/contract-serializer.js',
    '<rootDir>/tests/serializers/interaction-serializer.js'
  ],

  // Error handling
  errorOnDeprecated: true,

  // Max worker configuration for performance
  maxWorkers: process.env.CI ? 2 : '50%',

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Notification configuration (development only)
  notify: process.env.NODE_ENV !== 'ci',
  notifyMode: 'failure-change'
};