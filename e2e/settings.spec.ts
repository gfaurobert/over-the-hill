import { test, expect, type Page } from './fixtures/auth'
import { waitForActiveCollection } from './helpers'

function openSettingsMenu(page: Page) {
  return page
    .locator('.flex.flex-row.items-center.justify-between')
    .filter({ hasText: 'Over The Hill' })
    .locator('> div.relative > button')
    .first()
}

function closeSettingsModal(page: Page) {
  return page.getByRole('heading', { name: 'Settings' }).locator('..').getByRole('button').click()
}

test.describe('Settings modal', () => {
  test('should open and close settings modal @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await openSettingsMenu(authedPage).click()
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await closeSettingsModal(authedPage)
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).not.toBeVisible()
  })

  test('should switch theme to dark', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await openSettingsMenu(authedPage).click()
    await authedPage.getByRole('button', { name: /Dark/ }).click()

    await expect(authedPage.locator('html')).toHaveClass(/dark/)
  })

  test('should toggle hide collection name', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)
    const collectionInput = authedPage.getByPlaceholder('Select a collection...')
    const collectionName = await collectionInput.inputValue()

    const chartSvg = authedPage.locator('.mr-\\[15px\\]').locator('svg').first()
    await expect(chartSvg.getByText(collectionName, { exact: true })).toBeVisible()

    await openSettingsMenu(authedPage).click()
    await authedPage.getByRole('button', { name: /Hide Collection Name/ }).click()
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).not.toBeVisible()

    await expect(chartSvg.getByText(collectionName, { exact: true })).not.toBeVisible()

    await openSettingsMenu(authedPage).click()
    await authedPage.getByRole('button', { name: /Hide Collection Name/ }).click()
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).not.toBeVisible()

    await expect(chartSvg.getByText(collectionName, { exact: true })).toBeVisible()
  })

  test('should open color settings sub-modal', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await openSettingsMenu(authedPage).click()
    await authedPage.getByRole('button', { name: /Color Settings/ }).click()

    await expect(authedPage.getByRole('heading', { name: 'Color Settings' })).toBeVisible()
    await authedPage.getByRole('button', { name: 'Close' }).click()
    await expect(authedPage.getByRole('heading', { name: 'Color Settings' })).not.toBeVisible()
  })

  test('should switch copy format', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await openSettingsMenu(authedPage).click()
    await authedPage.getByRole('button', { name: /Copy as SVG/ }).click()
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).not.toBeVisible()

    await openSettingsMenu(authedPage).click()
    const copySvgRow = authedPage.getByRole('button', { name: /Copy as SVG/ })
    await expect(copySvgRow.locator('svg').last()).toBeVisible()
  })
})
