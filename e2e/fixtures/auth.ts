import { test as base, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json')

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ browser }, use) => {
    let context

    if (fs.existsSync(AUTH_FILE)) {
      context = await browser.newContext({ storageState: AUTH_FILE })
    } else {
      context = await browser.newContext()
      const page = await context.newPage()

      const email = process.env.PLAYWRIGHT_EMAIL
      const password = process.env.PLAYWRIGHT_PASSWORD

      if (!email || !password) {
        throw new Error(
          'No auth state file and PLAYWRIGHT_EMAIL / PLAYWRIGHT_PASSWORD not set.',
        )
      }

      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Email', { exact: true }).waitFor({ state: 'visible', timeout: 90_000 })
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.getByText('Over The Hill', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 })
      await page.close()
    }

    const page = await context.newPage()
    // Playwright fixture runner callback (not a React hook)
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright `use` fixture API
    await use(page)
    await context.close()
  },
})

export { expect, type Page } from '@playwright/test'
