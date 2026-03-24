import { test as testUnauth, expect, type Page } from '@playwright/test'
import { test as testAuth } from './fixtures/auth'

/**
 * Runs last (filename): sign-out revokes the refresh token in globalSetup storageState.
 * Any test that reuses .auth/user.json must run before this file.
 */
function openSettingsMenu(page: Page) {
  return page
    .locator('.flex.flex-row.items-center.justify-between')
    .filter({ hasText: 'Over The Hill' })
    .locator('> div.relative > button')
    .first()
}

testAuth.describe('Authentication (tail)', () => {
  testAuth('should sign out successfully', async ({ authedPage }) => {
    await authedPage.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await openSettingsMenu(authedPage).click()
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await authedPage.getByRole('button', { name: 'Sign Out' }).click()

    await expect(authedPage.getByLabel('Email', { exact: true })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })
})

testUnauth.describe('Authentication (tail)', () => {
  testUnauth('should sign in with valid credentials @smoke', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_EMAIL
    const password = process.env.PLAYWRIGHT_PASSWORD
    testUnauth.skip(!email || !password, 'Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD')

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByLabel('Email', { exact: true }).fill(email!)
    await page.getByLabel('Password', { exact: true }).fill(password!)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })
  })
})
