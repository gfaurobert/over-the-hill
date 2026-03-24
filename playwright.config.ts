import path from 'path'

import { config as loadEnv } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// Load E2E credentials and base URL (gitignored). Does not override vars already set in the shell.
loadEnv({ path: path.join(process.cwd(), 'e2e', '.env.playwright') })

// Default to 3001 so `npx playwright test` does not collide with another app on :3000 (e.g. Obsidian).
const defaultPort = process.env.PLAYWRIGHT_DEV_PORT || '3001'
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${defaultPort}`

function portForNextDev(): string {
  if (process.env.PLAYWRIGHT_DEV_PORT) return process.env.PLAYWRIGHT_DEV_PORT
  if (process.env.PLAYWRIGHT_BASE_URL) {
    try {
      const parsed = new URL(process.env.PLAYWRIGHT_BASE_URL)
      if (parsed.port) return parsed.port
    } catch {
      /* ignore */
    }
  }
  return defaultPort
}

const nextDevPort = portForNextDev()

export default defineConfig({
  testDir: './e2e',
  // Default discovery; each project narrows with its own testMatch.
  testMatch: ['**/*.spec.ts', '**/auth.setup.ts'],
  // Deterministic order: signing in with PLAYWRIGHT_* invalidates the globalSetup session for the same user.
  // Serial workers: shared Supabase user — avoid parallel races on collections/dots.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    viewport: { width: 1376, height: 768 },
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'] },
      grep: /@smoke/,
    },
    {
      name: 'webkit',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'] },
      grep: /@smoke/,
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${nextDevPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Disables proxy.ts per-IP nav rate limit (parallel workers share ::1).
    env: { PLAYWRIGHT_E2E: '1' },
  },
})
