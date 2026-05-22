import { test, expect, type Page } from './fixtures/auth'
import { waitForActiveCollection } from './helpers'

function snapshotCalendarPanel(page: Page) {
  return page
    .getByText('Snapshots', { exact: true })
    .locator('..')
    .locator('.bg-muted\\/30')
    .first()
}

test.describe('Snapshots', () => {
  test('should create a snapshot @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    await authedPage.getByRole('button', { name: /Snapshot/ }).click()
    await expect(authedPage.getByText('New Snapshot Created')).toBeVisible()
  })

  test('should show snapshot in calendar', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    await authedPage.getByRole('button', { name: /Snapshot/ }).click()
    await expect(authedPage.getByText('New Snapshot Created')).toBeVisible()

    const todayDay = String(new Date().getDate())
    const dayButton = snapshotCalendarPanel(authedPage).getByRole('button', {
      name: todayDay,
      exact: true,
    })
    await expect(dayButton).toBeEnabled()
  })

  test('should load and exit snapshot view', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    await authedPage.getByRole('button', { name: /Snapshot/ }).click()
    await expect(authedPage.getByText('New Snapshot Created')).toBeVisible()

    const todayDay = String(new Date().getDate())
    await snapshotCalendarPanel(authedPage)
      .getByRole('button', { name: todayDay, exact: true })
      .click()

    await expect(authedPage.getByRole('button', { name: 'View Live' })).toBeVisible()

    await authedPage.getByRole('button', { name: 'View Live' }).click()
    await expect(authedPage.getByRole('button', { name: /Snapshot/ })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'View Live' })).not.toBeVisible()
  })

  test('should navigate calendar months', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await waitForActiveCollection(authedPage)

    const panel = snapshotCalendarPanel(authedPage)
    const monthNav = panel.locator('.flex.items-center.justify-between').first()
    const monthLabel = monthNav.locator('.font-medium.text-sm')
    const before = await monthLabel.innerText()

    await monthNav.locator('button').nth(1).click()
    await expect(monthLabel).not.toHaveText(before)

    await monthNav.locator('button').nth(0).click()
    await expect(monthLabel).toHaveText(before)
  })
})
