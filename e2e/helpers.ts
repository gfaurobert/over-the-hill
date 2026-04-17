import { expect, type Page } from '@playwright/test'

/** Ensures the dashboard has an active collection (creates one if the account is empty). */
export async function waitForActiveCollection(page: Page) {
  const input = page.getByPlaceholder('Select a collection...')
  await expect(input).toBeVisible({ timeout: 30_000 })
  if ((await input.inputValue()) === '') {
    const name = `e2e-seed-${Date.now()}`
    await input.fill(name)
    await input.press('Enter')
    await expect(input).toHaveValue(name, { timeout: 20_000 })
  }
}

/**
 * Permanently deletes the currently active collection. Safe to call in test
 * cleanup blocks — swallows errors so a mid-test failure does not mask the
 * original assertion failure.
 */
export async function deleteActiveCollection(page: Page) {
  try {
    const input = page.getByPlaceholder('Select a collection...')
    if (!(await input.isVisible())) return
    if ((await input.inputValue()) === '') return

    await page.getByTitle('Delete collection').click()
    await expect(page.getByRole('heading', { name: 'Delete Collection' })).toBeVisible()
    await page
      .getByRole('heading', { name: 'Delete Collection' })
      .locator('..')
      .getByRole('button', { name: 'Delete Forever' })
      .click()
    await expect(page.getByRole('heading', { name: 'Delete Collection' })).not.toBeVisible()
  } catch {
    // Cleanup is best-effort; failure here must not fail the test.
  }
}
