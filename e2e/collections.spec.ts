import { test, expect } from './fixtures/auth'
import type { Page } from '@playwright/test'

async function openCollectionDropdown(authedPage: Page) {
  await authedPage
    .getByPlaceholder('Select a collection...')
    .locator('xpath=ancestor::div[contains(@class,"relative")]')
    .locator('div.absolute.right-0 button')
    .last()
    .click()
}

function collectionDropdown(authedPage: Page) {
  return authedPage.locator('div.absolute.z-50.max-h-60')
}

async function createCollection(authedPage: Page, name: string) {
  const input = authedPage.getByPlaceholder('Select a collection...')
  await input.fill(name)
  await input.press('Enter')
  // Combobox shows the active collection name after create, not an empty value.
  await expect(input).toHaveValue(name, { timeout: 20_000 })
}

test.describe('Collection CRUD', () => {
  test('should display collection selector @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible()
    await expect(authedPage.getByPlaceholder('Select a collection...')).toBeVisible()
  })

  test('should create a new collection', async ({ authedPage }) => {
    await authedPage.goto('/')
    const uniqueName = `e2e-col-${Date.now()}`
    await createCollection(authedPage, uniqueName)

    await openCollectionDropdown(authedPage)
    await expect(collectionDropdown(authedPage).getByText(uniqueName, { exact: true })).toBeVisible()
    await authedPage.keyboard.press('Escape')
  })

  test('should rename a collection', async ({ authedPage }) => {
    await authedPage.goto('/')
    const originalName = `e2e-rename-${Date.now()}`
    const renamed = `${originalName}-v2`
    await createCollection(authedPage, originalName)

    await authedPage.getByTitle('Edit collection name').click()
    const editInput = authedPage.getByPlaceholder('Collection name')
    await editInput.fill(renamed)
    await editInput.locator('..').getByRole('button').first().click()

    await expect(authedPage.getByPlaceholder('Select a collection...')).toHaveValue(renamed)
  })

  test('should archive and unarchive a collection', async ({ authedPage }) => {
    await authedPage.goto('/')
    const name = `e2e-arch-${Date.now()}`
    await createCollection(authedPage, name)

    await authedPage.getByTitle('Archive collection').click()
    await expect(authedPage.getByRole('heading', { name: 'Archive Collection' })).toBeVisible()
    await authedPage
      .getByRole('heading', { name: 'Archive Collection' })
      .locator('..')
      .getByRole('button', { name: 'Archive Collection' })
      .click()

    await openCollectionDropdown(authedPage)
    await expect(collectionDropdown(authedPage).getByText(name, { exact: true })).not.toBeVisible()
    await authedPage.keyboard.press('Escape')

    await authedPage
      .getByText('Over The Hill', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"justify-between")]/div[last()]/button')
      .click()
    await authedPage.getByRole('button', { name: /Archived Collections/ }).click()

    await expect(authedPage.getByRole('heading', { name: 'Archived Collections' })).toBeVisible()
    await expect(authedPage.getByText(name, { exact: true })).toBeVisible()
    await authedPage
      .locator('div')
      .filter({ has: authedPage.getByText(name, { exact: true }) })
      .filter({ has: authedPage.getByRole('button', { name: 'Unarchive' }) })
      .first()
      .getByRole('button', { name: 'Unarchive' })
      .click()

    await openCollectionDropdown(authedPage)
    await expect(collectionDropdown(authedPage).getByText(name, { exact: true })).toBeVisible()
    await authedPage.keyboard.press('Escape')
  })

  test('should delete a collection', async ({ authedPage }) => {
    await authedPage.goto('/')
    const name = `e2e-del-${Date.now()}`
    await createCollection(authedPage, name)

    await authedPage.getByTitle('Delete collection').click()
    await expect(authedPage.getByRole('heading', { name: 'Delete Collection' })).toBeVisible()
    await authedPage
      .getByRole('heading', { name: 'Delete Collection' })
      .locator('..')
      .getByRole('button', { name: 'Delete Forever' })
      .click()

    await openCollectionDropdown(authedPage)
    await expect(collectionDropdown(authedPage).getByText(name, { exact: true })).not.toBeVisible()
    await authedPage.keyboard.press('Escape')
  })

  test('should show conflict when creating duplicate name', async ({ authedPage }) => {
    await authedPage.goto('/')
    const name = `e2e-dup-${Date.now()}`
    await createCollection(authedPage, name)

    const input = authedPage.getByPlaceholder('Select a collection...')
    await input.fill(name)
    await input.press('Enter')

    await expect(authedPage.getByRole('heading', { name: 'Collection Name Already Exists' })).toBeVisible()
    await authedPage.getByRole('button', { name: 'OK' }).click()
  })
})
