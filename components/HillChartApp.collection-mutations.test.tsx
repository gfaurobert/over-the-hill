/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'

describe('HillChartApp collection mutations', () => {
  it('should call simpleDataService collection mutations with (userId, collectionId)', async () => {
    // This test reads the component source to assert the call signature,
    // matching the existing pattern used in HillChartApp.ellipsis-menu.test.tsx
    const fs = await import('fs')
    const path = await import('path')
    const componentPath = path.join(__dirname, 'HillChartApp.tsx')
    const componentSource = fs.readFileSync(componentPath, 'utf8')

    expect(componentSource).toContain('archiveCollection(user.id, collectionId)')
    expect(componentSource).toContain('unarchiveCollection(user.id, collectionId)')
    expect(componentSource).toContain('deleteCollection(user.id, collectionId)')
  })
})

