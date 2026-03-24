import fs from 'fs'
import path from 'path'

import { test as setup } from '@playwright/test'

const AUTH_FILE = path.join(process.cwd(), 'e2e', '.auth', 'user.json')

/**
 * Runs after webServer is up (unlike globalSetup). Writes storage state for the auth fixture.
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL
  const password = process.env.PLAYWRIGHT_PASSWORD
  if (!email || !password) {
    console.warn(
      '[auth.setup] PLAYWRIGHT_EMAIL / PLAYWRIGHT_PASSWORD not set — tests will sign in via the auth fixture.',
    )
    return
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email', { exact: true }).waitFor({ state: 'visible', timeout: 90_000 })
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.getByText('Over The Hill', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 })

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
