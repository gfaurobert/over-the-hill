import fs from 'fs'
import os from 'os'
import path from 'node:path'

import type { Page } from '@playwright/test'

import { test, expect } from './fixtures/auth'

function openSettingsMenu(page: Page) {
  return page
    .locator('.flex.flex-row.items-center.justify-between')
    .filter({ hasText: 'Over The Hill' })
    .locator('> div.relative > button')
    .first()
}

test.describe('Import / export data', () => {
  test('should export data as JSON @smoke', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await openSettingsMenu(authedPage).click()
    await expect(authedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

    const downloadPromise = authedPage.waitForEvent('download')
    await authedPage.getByRole('button', { name: 'Export Collections' }).click()
    const download = await downloadPromise

    const tmpPath = path.join(os.tmpdir(), `e2e-export-${Date.now()}.json`)
    await download.saveAs(tmpPath)
    try {
      const raw = fs.readFileSync(tmpPath, 'utf-8')
      const parsed = JSON.parse(raw) as {
        collections: unknown
        snapshots: unknown
        exportDate: unknown
        version: unknown
      }

      expect(Array.isArray(parsed.collections)).toBe(true)
      expect(Array.isArray(parsed.snapshots)).toBe(true)
      expect(typeof parsed.exportDate).toBe('string')
      expect(typeof parsed.version).toBe('string')
    } finally {
      fs.unlinkSync(tmpPath)
    }
  })

  test('should import valid JSON data', async ({ authedPage }) => {
    const payload = {
      collections: [
        {
          id: 'test-import-col',
          name: 'Imported Collection',
          status: 'active' as const,
          dots: [],
        },
      ],
      snapshots: [],
      exportDate: '2024-01-01T00:00:00.000Z',
      version: '1.0',
    }

    const tmpPath = path.join(os.tmpdir(), `e2e-import-valid-${Date.now()}.json`)
    fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf-8')

    try {
      await authedPage.goto('/')
      await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
        timeout: 15_000,
      })

      await openSettingsMenu(authedPage).click()
      await expect(authedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

      const fileInput = authedPage.locator('input[type="file"]')
      await fileInput.setInputFiles(tmpPath)

      await expect(authedPage.getByRole('heading', { name: 'Import Successful' })).toBeVisible({
        timeout: 60_000,
      })
      await expect(
        authedPage.getByText('Your data has been imported successfully.'),
      ).toBeVisible()
      await authedPage.getByRole('button', { name: 'Close' }).click()
    } finally {
      fs.unlinkSync(tmpPath)
    }
  })

  test('should show error for invalid import data', async ({ authedPage }) => {
    const tmpPath = path.join(os.tmpdir(), `e2e-import-invalid-${Date.now()}.json`)
    fs.writeFileSync(tmpPath, '{"invalid": true}', 'utf-8')

    try {
      await authedPage.goto('/')
      await expect(authedPage.getByText('Over The Hill', { exact: true })).toBeVisible({
        timeout: 15_000,
      })

      await openSettingsMenu(authedPage).click()
      await expect(authedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

      const fileInput = authedPage.locator('input[type="file"]')
      await fileInput.setInputFiles(tmpPath)

      await expect(authedPage.getByRole('heading', { name: 'Import Error' })).toBeVisible({
        timeout: 30_000,
      })
      await expect(authedPage.getByRole('button', { name: 'Close' })).toBeVisible()
    } finally {
      fs.unlinkSync(tmpPath)
    }
  })
})
