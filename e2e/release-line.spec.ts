import { test, expect, type Page } from './fixtures/auth'
import { waitForActiveCollection } from './helpers'

function openSettingsMenu(page: Page) {
  return page
    .locator('.flex.flex-row.items-center.justify-between')
    .filter({ hasText: 'Over The Hill' })
    .locator('> div.relative > button')
    .first()
}

async function openColorSettings(page: Page) {
  await openSettingsMenu(page).click()
  await page.getByRole('button', { name: /Color Settings/ }).click()
}

function releaseLineLine(page: Page) {
  return page.locator('line[x1="600"][x2="600"][y1="-20"]')
}

test.describe('Release line', () => {
  test('should enable release line @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    await openColorSettings(authedPage)
    await expect(authedPage.getByRole('heading', { name: 'Color Settings' })).toBeVisible()

    await authedPage.getByLabel('Release Line').click()
    await authedPage.getByRole('button', { name: 'Close' }).click()

    await expect(releaseLineLine(authedPage)).toBeVisible()
    await expect(releaseLineLine(authedPage)).toHaveAttribute('stroke', '#ff00ff')

    await openColorSettings(authedPage)
    await authedPage.getByLabel('Release Line').click()
    await authedPage.getByRole('button', { name: 'Close' }).click()
    await expect(releaseLineLine(authedPage)).toHaveCount(0)
  })

  test('should set release line color and text', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    await openColorSettings(authedPage)
    await authedPage.getByLabel('Release Line').click()
    await authedPage.getByTestId('color-picker').fill('#00aa00')
    await authedPage.getByTestId('text-input').fill('Ship It')
    await authedPage.getByRole('button', { name: 'Close' }).click()

    await expect(releaseLineLine(authedPage)).toBeVisible()
    await expect(releaseLineLine(authedPage)).toHaveAttribute('stroke', '#00aa00')
    await expect(authedPage.locator('svg').getByText('Ship It', { exact: true })).toBeVisible()

    await openColorSettings(authedPage)
    await authedPage.getByTestId('color-picker').fill('#ff00ff')
    await authedPage.getByTestId('text-input').fill('')
    await authedPage.getByLabel('Release Line').click()
    await authedPage.getByRole('button', { name: 'Close' }).click()
  })

  test('should disable release line', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    await openColorSettings(authedPage)
    await authedPage.getByLabel('Release Line').click()
    await authedPage.getByRole('button', { name: 'Close' }).click()
    await expect(releaseLineLine(authedPage)).toBeVisible()

    await openColorSettings(authedPage)
    await authedPage.getByLabel('Release Line').click()
    await authedPage.getByRole('button', { name: 'Close' }).click()
    await expect(releaseLineLine(authedPage)).toHaveCount(0)
  })
})
