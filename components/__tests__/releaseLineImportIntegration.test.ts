/**
 * Integration test to verify that release line configuration works end-to-end
 * in the JSON import functionality
 */

import { validateImportData } from '../../lib/validation'
import type { ExportData } from '../HillChartApp'

describe('Release Line Import Integration', () => {
  describe('Full Import Flow', () => {
    test('should handle complete export data with release line configurations', () => {
      const completeExportData: ExportData = {
        collections: [
          {
            id: 'collection-1',
            name: 'Project Alpha',
            status: 'active',
            dots: [
              {
                id: 'dot-1',
                label: 'Feature A',
                x: 25,
                y: 45,
                color: '#3b82f6',
                size: 3,
                archived: false
              },
              {
                id: 'dot-2',
                label: 'Feature B',
                x: 75,
                y: 30,
                color: '#22c55e',
                size: 4,
                archived: false
              }
            ],
            releaseLineConfig: {
              enabled: true,
              color: '#ff0000',
              text: 'Q1 2024 Release'
            }
          },
          {
            id: 'collection-2',
            name: 'Project Beta',
            status: 'archived',
            archived_at: '2024-01-01T00:00:00Z',
            dots: [
              {
                id: 'dot-3',
                label: 'Legacy Feature',
                x: 90,
                y: 20,
                color: '#8b5cf6',
                size: 2,
                archived: true
              }
            ]
            // No release line config for this collection
          }
        ],
        snapshots: [
          {
            date: '2024-01-15',
            collectionId: 'collection-1',
            collectionName: 'Project Alpha',
            dots: [
              {
                id: 'dot-1',
                label: 'Feature A',
                x: 20,
                y: 50,
                color: '#3b82f6',
                size: 3,
                archived: false
              }
            ],
            timestamp: 1705320000000,
            releaseLineConfig: {
              enabled: true,
              color: '#00ff00',
              text: 'Snapshot Milestone'
            }
          },
          {
            date: '2024-01-10',
            collectionId: 'collection-2',
            collectionName: 'Project Beta',
            dots: [
              {
                id: 'dot-3',
                label: 'Legacy Feature',
                x: 85,
                y: 25,
                color: '#8b5cf6',
                size: 2,
                archived: false
              }
            ],
            timestamp: 1704888000000
            // No release line config for this snapshot
          }
        ],
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(completeExportData)

      // Verify collections
      expect(result.collections).toHaveLength(2)
      
      // Check first collection with release line config
      const collection1 = result.collections[0]
      expect(collection1.id).toBe('collection-1')
      expect(collection1.name).toBe('Project Alpha')
      expect(collection1.releaseLineConfig).toBeDefined()
      expect(collection1.releaseLineConfig?.enabled).toBe(true)
      expect(collection1.releaseLineConfig?.color).toBe('#ff0000')
      expect(collection1.releaseLineConfig?.text).toBe('Q1 2024 Release')
      expect(collection1.dots).toHaveLength(2)

      // Check second collection without release line config
      const collection2 = result.collections[1]
      expect(collection2.id).toBe('collection-2')
      expect(collection2.name).toBe('Project Beta')
      expect(collection2.releaseLineConfig).toBeUndefined()
      expect(collection2.dots).toHaveLength(1)

      // Verify snapshots
      expect(result.snapshots).toHaveLength(2)
      
      // Check first snapshot with release line config
      const snapshot1 = result.snapshots[0]
      expect(snapshot1.collectionId).toBe('collection-1')
      expect(snapshot1.releaseLineConfig).toBeDefined()
      expect(snapshot1.releaseLineConfig?.enabled).toBe(true)
      expect(snapshot1.releaseLineConfig?.color).toBe('#00ff00')
      expect(snapshot1.releaseLineConfig?.text).toBe('Snapshot Milestone')

      // Check second snapshot without release line config
      const snapshot2 = result.snapshots[1]
      expect(snapshot2.collectionId).toBe('collection-2')
      expect(snapshot2.releaseLineConfig).toBeUndefined()
    })

    test('should handle export data with mixed valid and default release line configurations', () => {
      const mixedExportData: ExportData = {
        collections: [
          {
            id: 'collection-1',
            name: 'Collection with Partial Config',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: true
              // Missing color and text - should use defaults
            } as any
          },
          {
            id: 'collection-2',
            name: 'Collection with Full Config',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: false,
              color: '#123456',
              text: 'Custom Release'
            }
          }
        ],
        snapshots: [],
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(mixedExportData)

      // Check first collection with partial config
      const collection1 = result.collections[0]
      expect(collection1.releaseLineConfig?.enabled).toBe(true)
      expect(collection1.releaseLineConfig?.color).toBe('#ff00ff') // Default color
      expect(collection1.releaseLineConfig?.text).toBe('') // Default empty text

      // Check second collection with full config
      const collection2 = result.collections[1]
      expect(collection2.releaseLineConfig?.enabled).toBe(false)
      expect(collection2.releaseLineConfig?.color).toBe('#123456')
      expect(collection2.releaseLineConfig?.text).toBe('Custom Release')
    })

    test('should handle large export data with many collections and snapshots', () => {
      const collections = []
      const snapshots = []

      // Create 10 collections with alternating release line configs
      for (let i = 0; i < 10; i++) {
        const hasReleaseLineConfig = i % 2 === 0
        collections.push({
          id: `collection-${i}`,
          name: `Collection ${i}`,
          status: 'active',
          dots: [
            {
              id: `dot-${i}-1`,
              label: `Dot ${i}-1`,
              x: 25 + (i * 5),
              y: 45,
              color: '#3b82f6',
              size: 3,
              archived: false
            }
          ],
          ...(hasReleaseLineConfig && {
            releaseLineConfig: {
              enabled: true,
              color: `#${(i * 111111).toString(16).padStart(6, '0').slice(0, 6)}`,
              text: `Release ${i}`
            }
          })
        })

        // Create 2 snapshots per collection
        for (let j = 0; j < 2; j++) {
          const hasSnapshotReleaseLineConfig = (i + j) % 3 === 0
          snapshots.push({
            date: `2024-01-${(i * 2 + j + 1).toString().padStart(2, '0')}`,
            collectionId: `collection-${i}`,
            collectionName: `Collection ${i}`,
            dots: [
              {
                id: `dot-${i}-1`,
                label: `Dot ${i}-1`,
                x: 20 + (j * 10),
                y: 40,
                color: '#3b82f6',
                size: 3,
                archived: false
              }
            ],
            timestamp: 1705320000000 + (i * 86400000) + (j * 43200000),
            ...(hasSnapshotReleaseLineConfig && {
              releaseLineConfig: {
                enabled: true,
                color: '#00ff00',
                text: `Snapshot ${i}-${j}`
              }
            })
          })
        }
      }

      const largeExportData: ExportData = {
        collections,
        snapshots,
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(largeExportData)

      expect(result.collections).toHaveLength(10)
      expect(result.snapshots).toHaveLength(20)

      // Verify that release line configs are preserved correctly
      let collectionsWithReleaseLineConfig = 0
      let snapshotsWithReleaseLineConfig = 0

      result.collections.forEach((collection, index) => {
        if (index % 2 === 0) {
          expect(collection.releaseLineConfig).toBeDefined()
          expect(collection.releaseLineConfig?.text).toBe(`Release ${index}`)
          collectionsWithReleaseLineConfig++
        } else {
          expect(collection.releaseLineConfig).toBeUndefined()
        }
      })

      result.snapshots.forEach((snapshot, index) => {
        const collectionIndex = Math.floor(index / 2)
        const snapshotIndex = index % 2
        if ((collectionIndex + snapshotIndex) % 3 === 0) {
          expect(snapshot.releaseLineConfig).toBeDefined()
          expect(snapshot.releaseLineConfig?.text).toBe(`Snapshot ${collectionIndex}-${snapshotIndex}`)
          snapshotsWithReleaseLineConfig++
        } else {
          expect(snapshot.releaseLineConfig).toBeUndefined()
        }
      })

      expect(collectionsWithReleaseLineConfig).toBe(5) // Half of 10
      expect(snapshotsWithReleaseLineConfig).toBeGreaterThan(0) // Some snapshots should have configs
    })
  })

  describe('Error Recovery and Validation', () => {
    test('should provide clear error messages for invalid release line data', () => {
      const invalidExportData = {
        collections: [
          {
            id: 'collection-1',
            name: 'Valid Collection',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: true,
              color: '#00ff00',
              text: 'Valid'
            }
          },
          {
            id: 'collection-2',
            name: 'Invalid Collection',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: true,
              color: 'not-a-color', // Invalid
              text: 'Invalid'
            }
          }
        ],
        snapshots: [],
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      expect(() => validateImportData(invalidExportData)).toThrow(/Invalid collection at index 1.*Invalid release line configuration/)
    })

    test('should handle corrupted release line data gracefully', () => {
      const corruptedExportData = {
        collections: [
          {
            id: 'collection-1',
            name: 'Collection with Corrupted Config',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: 'not-a-boolean', // Invalid type
              color: 123, // Invalid type
              text: ['not', 'a', 'string'] // Invalid type
            }
          }
        ],
        snapshots: [],
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      expect(() => validateImportData(corruptedExportData)).toThrow(/Invalid collection at index 0/)
    })
  })

  describe('Performance and Limits', () => {
    test('should handle maximum allowed text length', () => {
      const maxLengthText = 'A'.repeat(50) // Exactly 50 characters

      const exportData: ExportData = {
        collections: [
          {
            id: 'collection-1',
            name: 'Collection with Max Length Text',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: true,
              color: '#ff00ff',
              text: maxLengthText
            }
          }
        ],
        snapshots: [],
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(exportData)
      expect(result.collections[0].releaseLineConfig?.text).toBe(maxLengthText)
      expect(result.collections[0].releaseLineConfig?.text.length).toBe(50)
    })

    test('should trim whitespace from release line configuration', () => {
      const exportData: ExportData = {
        collections: [
          {
            id: 'collection-1',
            name: 'Collection with Whitespace',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: true,
              color: '  #FF00FF  ', // Whitespace around color
              text: '  Release 1.0  ' // Whitespace around text
            }
          }
        ],
        snapshots: [],
        exportDate: '2024-01-20T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(exportData)
      expect(result.collections[0].releaseLineConfig?.color).toBe('#FF00FF')
      expect(result.collections[0].releaseLineConfig?.text).toBe('Release 1.0')
    })
  })
})