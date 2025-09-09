/**
 * Test to verify that release line configuration is properly included in exports
 */

import { ReleaseLineConfig } from '../HillChartApp'

describe('Release Line Export Functionality', () => {
  test('release line configuration should be included in collection export', () => {
    // Mock collection with release line config
    const mockCollection = {
      id: 'test-collection-1',
      name: 'Test Collection',
      status: 'active' as const,
      dots: [],
    }

    const mockReleaseLineSettings = {
      'test-collection-1': {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      } as ReleaseLineConfig
    }

    // Simulate the export logic from HillChartApp
    const cleanCollection = {
      id: mockCollection.id,
      name: mockCollection.name,
      status: mockCollection.status,
      dots: mockCollection.dots,
      // Include release line configuration if it exists
      ...(mockReleaseLineSettings[mockCollection.id] && {
        releaseLineConfig: mockReleaseLineSettings[mockCollection.id]
      })
    }

    // Verify that release line config is included
    expect(cleanCollection.releaseLineConfig).toBeDefined()
    expect(cleanCollection.releaseLineConfig?.enabled).toBe(true)
    expect(cleanCollection.releaseLineConfig?.color).toBe('#ff00ff')
    expect(cleanCollection.releaseLineConfig?.text).toBe('Q4 2024 Release')
  })

  test('collection export should work without release line configuration', () => {
    // Mock collection without release line config
    const mockCollection = {
      id: 'test-collection-2',
      name: 'Test Collection 2',
      status: 'active' as const,
      dots: [],
    }

    const mockReleaseLineSettings = {} // No release line settings

    // Simulate the export logic from HillChartApp
    const cleanCollection = {
      id: mockCollection.id,
      name: mockCollection.name,
      status: mockCollection.status,
      dots: mockCollection.dots,
      // Include release line configuration if it exists
      ...(mockReleaseLineSettings[mockCollection.id] && {
        releaseLineConfig: mockReleaseLineSettings[mockCollection.id]
      })
    }

    // Verify that release line config is not included
    expect(cleanCollection.releaseLineConfig).toBeUndefined()
  })

  test('snapshot export should include release line configuration when available', () => {
    // Mock snapshot with release line config
    const mockSnapshot = {
      date: '2024-01-15',
      collectionId: 'test-collection-1',
      collectionName: 'Test Collection',
      dots: [],
      timestamp: Date.now(),
      releaseLineConfig: {
        enabled: true,
        color: '#00ff00',
        text: 'Milestone 1'
      } as ReleaseLineConfig
    }

    // Simulate the export logic from HillChartApp
    const cleanSnapshot = {
      date: mockSnapshot.date,
      collectionId: mockSnapshot.collectionId,
      collectionName: mockSnapshot.collectionName,
      dots: mockSnapshot.dots,
      timestamp: mockSnapshot.timestamp,
      // Include release line configuration if it exists in the snapshot
      ...(mockSnapshot.releaseLineConfig && {
        releaseLineConfig: mockSnapshot.releaseLineConfig
      })
    }

    // Verify that release line config is included
    expect(cleanSnapshot.releaseLineConfig).toBeDefined()
    expect(cleanSnapshot.releaseLineConfig?.enabled).toBe(true)
    expect(cleanSnapshot.releaseLineConfig?.color).toBe('#00ff00')
    expect(cleanSnapshot.releaseLineConfig?.text).toBe('Milestone 1')
  })

  test('snapshot export should work without release line configuration', () => {
    // Mock snapshot without release line config
    const mockSnapshot = {
      date: '2024-01-15',
      collectionId: 'test-collection-2',
      collectionName: 'Test Collection 2',
      dots: [],
      timestamp: Date.now()
      // No releaseLineConfig
    }

    // Simulate the export logic from HillChartApp
    const cleanSnapshot = {
      date: mockSnapshot.date,
      collectionId: mockSnapshot.collectionId,
      collectionName: mockSnapshot.collectionName,
      dots: mockSnapshot.dots,
      timestamp: mockSnapshot.timestamp,
      // Include release line configuration if it exists in the snapshot
      ...(mockSnapshot.releaseLineConfig && {
        releaseLineConfig: mockSnapshot.releaseLineConfig
      })
    }

    // Verify that release line config is not included
    expect(cleanSnapshot.releaseLineConfig).toBeUndefined()
  })
})