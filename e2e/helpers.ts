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
