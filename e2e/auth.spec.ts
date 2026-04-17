import { test as testUnauth, expect, type Page } from '@playwright/test'
import { test as testAuth } from './fixtures/auth'

async function gotoSignIn(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible({
    timeout: 30_000,
  })
}

testUnauth.describe('Authentication (unauthenticated)', () => {
  testUnauth('should show sign-in form when not authenticated', async ({ page }) => {
    await gotoSignIn(page)
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  testUnauth('should show error with invalid credentials', async ({ page }) => {
    await gotoSignIn(page)
    await page.getByLabel('Email', { exact: true }).fill('not-a-real-user@example.com')
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-12345')
    await page.getByRole('button', { name: 'Sign In' }).click()

    const error = page.locator('.text-red-600')
    await expect(error).toBeVisible()
    await expect(error).not.toHaveText('')
  })

  testUnauth('should disable magic link button when email is empty', async ({ page }) => {
    await gotoSignIn(page)
    const magicLink = page.getByRole('button', { name: 'Send Magic Link' })
    await expect(magicLink).toBeDisabled()

    await page.getByLabel('Email', { exact: true }).fill('someone@example.com')
    await expect(magicLink).toBeEnabled()
  })

  testUnauth('should show Request Access form', async ({ page }) => {
    await gotoSignIn(page)
    await page.getByRole('button', { name: 'Request Access' }).click()
    await expect(
      page.getByPlaceholder('Tell us why you need access...'),
    ).toBeVisible()
  })

  testUnauth('should show forgot password action', async ({ page }) => {
    await gotoSignIn(page)
    await page.getByRole('button', { name: 'Forgot your password?' }).click()
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible()
  })
})

testAuth.describe('Authentication (session)', () => {
  testAuth('should persist session across page reload', async ({ authedPage }) => {
    await authedPage.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await authedPage.reload({ waitUntil: 'domcontentloaded' })
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })
  })
})

