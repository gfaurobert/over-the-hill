import { test, expect } from './fixtures/auth'
import type { Page } from '@playwright/test'
import { deleteActiveCollection } from './helpers'

async function openCollectionDropdown(authedPage: Page) {
  await authedPage
    .getByPlaceholder('Select a collection...')
    .locator('xpath=ancestor::div[contains(@class,"relative")]')
    .locator('div.absolute.right-0 button')
    .last()
    .click()
}

async function createCollection(authedPage: Page, name: string) {
  const input = authedPage.getByPlaceholder('Select a collection...')
  await input.fill(name)
  await input.press('Enter')
  await expect(input).toHaveValue(name, { timeout: 20_000 })
}

async function addDot(authedPage: Page, label: string) {
  const dotInput = authedPage.getByPlaceholder('Enter dot name and press Enter to add...')
  await dotInput.fill(label)
  await dotInput.press('Enter')
}

function dotsSection(authedPage: Page) {
  return authedPage.locator('div').filter({ has: authedPage.getByText('Dots', { exact: true }) })
}

test.describe('Dots', () => {
  test('should add a new dot @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await createCollection(authedPage, `e2e-dots-smoke-${Date.now()}`)
    const label = `dot-${Date.now()}`
    try {
      await addDot(authedPage, label)

      await expect(dotsSection(authedPage).getByText(label, { exact: true })).toBeVisible()
    } finally {
      await deleteActiveCollection(authedPage)
    }
  })

  test('should edit a dot label', async ({ authedPage }) => {
    await authedPage.goto('/')
    await createCollection(authedPage, `e2e-dots-edit-${Date.now()}`)
    const label = `dot-edit-${Date.now()}`
    const renamed = `${label}-saved`
    await addDot(authedPage, label)

    await authedPage.getByTitle('Double-click to rename').filter({ hasText: label }).dblclick()
    await authedPage.getByRole('button', { name: `Save renaming ${label}` }).locator('..').getByRole('textbox').fill(renamed)
    await authedPage.getByRole('button', { name: `Save renaming ${label}` }).click()

    await expect(dotsSection(authedPage).getByText(renamed, { exact: true })).toBeVisible()
  })

  test('should delete a dot', async ({ authedPage }) => {
    await authedPage.goto('/')
    await createCollection(authedPage, `e2e-dots-del-${Date.now()}`)
    const label = `dot-del-${Date.now()}`
    await addDot(authedPage, label)

    await authedPage.getByRole('button', { name: `Open actions for ${label}` }).click()
    await authedPage.locator('[data-dot-action-root]').getByRole('button', { name: 'Delete' }).click()

    await expect(authedPage.getByRole('heading', { name: 'Delete Dot' })).toBeVisible()
    await authedPage
      .getByRole('heading', { name: 'Delete Dot' })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      .getByRole('button', { name: 'Delete' })
      .click()

    await expect(dotsSection(authedPage).getByText(label, { exact: true })).not.toBeVisible()
  })

  test('should display dots on SVG chart', async ({ authedPage }) => {
    await authedPage.goto('/')
    await createCollection(authedPage, `e2e-dots-svg-${Date.now()}`)
    const label = `dot-svg-${Date.now()}`
    await addDot(authedPage, label)

    const svg = authedPage.locator('svg[viewBox="-28 -46 655 210"]')
    await expect(svg.locator('circle').first()).toBeVisible()
  })

  test('should drag a dot along the hill @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await createCollection(authedPage, `e2e-dots-drag-${Date.now()}`)
    const label = `dot-drag-${Date.now()}`
    try {
      await addDot(authedPage, label)

      const svg = authedPage.locator('svg[viewBox="-28 -46 655 210"]')
      const circle = svg.locator('circle').first()
      await expect(circle).toBeVisible()

      const cxBefore = await circle.getAttribute('cx')
      const box = await circle.boundingBox()
      expect(box).not.toBeNull()

      await authedPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
      await authedPage.mouse.down()
      await authedPage.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2)
      await authedPage.mouse.up()

      await expect.poll(async () => circle.getAttribute('cx')).not.toBe(cxBefore)
    } finally {
      await deleteActiveCollection(authedPage)
    }
  })
})
