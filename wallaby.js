module.exports = function (wallaby) {
  process.env.NODE_ENV = 'test'
  return {
    name: 'rocket-control',
    files: [
      'tsconfig.json',
      { pattern: 'packages/**/src/**/*.ts', load: true },
      { pattern: 'packages/**/src/**/*.spec.ts', ignore: true },
      { pattern: 'packages/**/node_modules/**', ignore: true }
    ],
    tests: [
      { pattern: 'packages/**/src/**/*.spec.ts', load: true },
      { pattern: 'packages/**/node_modules/**', ignore: true }
    ],
    filesWithNoCoverageCalculated: [
      'packages/**/src/index.ts'
    ],
    testFramework: 'mocha',
    env: {
      type: 'node'
    },
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({ module: 'commonjs' })
    },
    debug: true,
    slowTestThreshold: 200,
    delays: {
      run: 2500
    }
  }
}
