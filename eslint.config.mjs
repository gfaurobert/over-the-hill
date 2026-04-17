import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Local git worktrees (each may contain its own .next / node_modules)
    '.worktrees/**',
    'node_modules/**',
    'coverage/**',
    'playwright-report/**',
    'QA/**',
    'temp/**',
    'scripts/**',
    'dist/**',
    'docs/**/.obsidian/**',
    'debug-collections.js',
    'jest.config.js',
  ]),
])

export default eslintConfig
