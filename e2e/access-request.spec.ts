import { test, expect, type Page } from '@playwright/test'

async function openAccessRequestForm(page: Page) {
  await page.goto('/')
  await expect(page.getByPlaceholder('m@example.com')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Request Access' }).click()
  await expect(page.getByLabel('Message (optional)')).toBeVisible({ timeout: 15_000 })
}

test.describe('Access request form', () => {
  test('should display access request form', async ({ page }) => {
    await openAccessRequestForm(page)

    await expect(page.getByLabel('Message (optional)')).toBeVisible()
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  })

  test('should submit access request successfully @smoke', async ({ page }) => {
    await page.route('/api/access-request', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await openAccessRequestForm(page)

    await page.getByPlaceholder('m@example.com').fill('test-e2e@example.com')
    await page.getByPlaceholder('Tell us why you need access...').fill('E2E test')
    await page.getByRole('button', { name: 'Request Access' }).click()

    await expect(page.getByText(/Request received!/)).toBeVisible()
  })

  test('should show validation for empty email', async ({ page }) => {
    let postCount = 0
    await page.route('/api/access-request', async (route) => {
      if (route.request().method() === 'POST') postCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await openAccessRequestForm(page)

    await page.getByRole('button', { name: 'Request Access' }).click()

    expect(postCount).toBe(0)
    await expect(page.getByText(/Request received!/)).toHaveCount(0)
    await expect(page.locator('#email')).toHaveJSProperty('validity.valueMissing', true)
  })
})
