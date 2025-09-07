/**
 * Test to verify that release line configuration is properly handled during JSON import
 */

import { validateImportData, validateReleaseLineConfig, ValidationError } from '../../lib/validation'
import type { ExportData, ReleaseLineConfig } from '../HillChartApp'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Release Line Import Functionality', () => {
  describe('validateReleaseLineConfig', () => {
    test('should validate valid release line configuration', () => {
      const validConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      }

      const result = validateReleaseLineConfig(validConfig)
      
      expect(result.enabled).toBe(true)
      expect(result.color).toBe('#ff00ff')
      expect(result.text).toBe('Q4 2024 Release')
    })

    test('should use defaults for missing fields', () => {
      const partialConfig = {
        enabled: true
      }

      const result = validateReleaseLineConfig(partialConfig)
      
      expect(result.enabled).toBe(true)
      expect(result.color).toBe('#ff00ff') // Default color
      expect(result.text).toBe('') // Default empty text
    })

    test('should validate hex color format', () => {
      const invalidColorConfig = {
        enabled: true,
        color: 'invalid-color',
        text: 'Test'
      }

      expect(() => validateReleaseLineConfig(invalidColorConfig)).toThrow('Invalid hex color format')
    })

    test('should enforce text length limit', () => {
      const longTextConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'This is a very long text that exceeds the fifty character limit for release line text'
      }

      expect(() => validateReleaseLineConfig(longTextConfig)).toThrow('Input too long. Maximum 50 characters allowed')
    })

    test('should handle boolean conversion for enabled field', () => {
      const nonBooleanConfig = {
        enabled: 'true' as any, // Invalid type
        color: '#ff00ff',
        text: 'Test'
      }

      const result = validateReleaseLineConfig(nonBooleanConfig)
      expect(result.enabled).toBe(false) // Should default to false for non-boolean
    })
  })

  describe('Collection Import with Release Line Config', () => {
    test('should import collection with valid release line configuration', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-1',
          name: 'Test Collection',
          status: 'active',
          dots: [],
          releaseLineConfig: {
            enabled: true,
            color: '#00ff00',
            text: 'Release 1.0'
          }
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.collections).toHaveLength(1)
      expect(result.collections[0].releaseLineConfig).toBeDefined()
      expect(result.collections[0].releaseLineConfig?.enabled).toBe(true)
      expect(result.collections[0].releaseLineConfig?.color).toBe('#00ff00')
      expect(result.collections[0].releaseLineConfig?.text).toBe('Release 1.0')
    })

    test('should import collection without release line configuration', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-2',
          name: 'Test Collection 2',
          status: 'active',
          dots: []
          // No releaseLineConfig
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.collections).toHaveLength(1)
      expect(result.collections[0].releaseLineConfig).toBeUndefined()
    })

    test('should reject collection with invalid release line configuration', () => {
      const importData = {
        collections: [{
          id: 'test-collection-3',
          name: 'Test Collection 3',
          status: 'active',
          dots: [],
          releaseLineConfig: {
            enabled: true,
            color: 'invalid-color', // Invalid hex color
            text: 'Test'
          }
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      expect(() => validateImportData(importData)).toThrow('Invalid release line configuration')
    })

    test('should sanitize release line configuration during import', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-4',
          name: 'Test Collection 4',
          status: 'active',
          dots: [],
          releaseLineConfig: {
            enabled: true,
            color: '  #FF00FF  ', // Color with whitespace
            text: '  Release 2.0  ' // Text with whitespace
          }
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.collections[0].releaseLineConfig?.color).toBe('#FF00FF') // Trimmed
      expect(result.collections[0].releaseLineConfig?.text).toBe('Release 2.0') // Trimmed
    })
  })

  describe('Snapshot Import with Release Line Config', () => {
    test('should import snapshot with valid release line configuration', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-1',
          name: 'Test Collection',
          status: 'active',
          dots: []
        }],
        snapshots: [{
          date: '2024-01-15',
          collectionId: 'test-collection-1',
          collectionName: 'Test Collection',
          dots: [],
          timestamp: 1705320000000,
          releaseLineConfig: {
            enabled: true,
            color: '#0000ff',
            text: 'Snapshot Release'
          }
        }],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.snapshots).toHaveLength(1)
      expect(result.snapshots[0].releaseLineConfig).toBeDefined()
      expect(result.snapshots[0].releaseLineConfig?.enabled).toBe(true)
      expect(result.snapshots[0].releaseLineConfig?.color).toBe('#0000ff')
      expect(result.snapshots[0].releaseLineConfig?.text).toBe('Snapshot Release')
    })

    test('should import snapshot without release line configuration', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-2',
          name: 'Test Collection 2',
          status: 'active',
          dots: []
        }],
        snapshots: [{
          date: '2024-01-15',
          collectionId: 'test-collection-2',
          collectionName: 'Test Collection 2',
          dots: [],
          timestamp: 1705320000000
          // No releaseLineConfig
        }],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.snapshots).toHaveLength(1)
      expect(result.snapshots[0].releaseLineConfig).toBeUndefined()
    })

    test('should reject snapshot with invalid release line configuration', () => {
      const importData = {
        collections: [{
          id: 'test-collection-3',
          name: 'Test Collection 3',
          status: 'active',
          dots: []
        }],
        snapshots: [{
          date: '2024-01-15',
          collectionId: 'test-collection-3',
          collectionName: 'Test Collection 3',
          dots: [],
          timestamp: 1705320000000,
          releaseLineConfig: {
            enabled: true,
            color: 'rgb(255,0,0)', // Invalid format (not hex)
            text: 'Test'
          }
        }],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      expect(() => validateImportData(importData)).toThrow('Invalid release line configuration in snapshot')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty release line configuration gracefully', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-1',
          name: 'Test Collection',
          status: 'active',
          dots: [],
          releaseLineConfig: {} as any // Empty config
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.collections[0].releaseLineConfig).toBeDefined()
      expect(result.collections[0].releaseLineConfig?.enabled).toBe(false) // Default
      expect(result.collections[0].releaseLineConfig?.color).toBe('#ff00ff') // Default
      expect(result.collections[0].releaseLineConfig?.text).toBe('') // Default
    })

    test('should handle null release line configuration', () => {
      const importData: ExportData = {
        collections: [{
          id: 'test-collection-1',
          name: 'Test Collection',
          status: 'active',
          dots: [],
          releaseLineConfig: null as any
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(importData)
      
      expect(result.collections[0].releaseLineConfig).toBeUndefined()
    })

    test('should provide detailed error messages for invalid configurations', () => {
      const importData = {
        collections: [{
          id: 'test-collection-1',
          name: 'Test Collection',
          status: 'active',
          dots: [],
          releaseLineConfig: {
            enabled: true,
            color: '#gggggg', // Invalid hex characters
            text: 'This text is way too long and exceeds the fifty character limit that we have set for release line text'
          }
        }],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      expect(() => validateImportData(importData)).toThrow(/Invalid release line configuration/)
    })

    test('should handle mixed valid and invalid collections', () => {
      const importData = {
        collections: [
          {
            id: 'valid-collection',
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
            id: 'invalid-collection',
            name: 'Invalid Collection',
            status: 'active',
            dots: [],
            releaseLineConfig: {
              enabled: true,
              color: 'not-a-hex-color',
              text: 'Invalid'
            }
          }
        ],
        snapshots: [],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      // Should fail on the first invalid collection
      expect(() => validateImportData(importData)).toThrow('Invalid collection at index 1')
    })
  })

  describe('Backward Compatibility', () => {
    test('should handle legacy export data without release line configuration', () => {
      const legacyImportData = {
        collections: [{
          id: 'legacy-collection',
          name: 'Legacy Collection',
          status: 'active',
          dots: []
          // No releaseLineConfig field at all
        }],
        snapshots: [{
          date: '2024-01-15',
          collectionId: 'legacy-collection',
          collectionName: 'Legacy Collection',
          dots: [],
          timestamp: 1705320000000
          // No releaseLineConfig field at all
        }],
        exportDate: '2024-01-15T10:00:00Z',
        version: '1.0.0'
      }

      const result = validateImportData(legacyImportData)
      
      expect(result.collections).toHaveLength(1)
      expect(result.collections[0].releaseLineConfig).toBeUndefined()
      expect(result.snapshots).toHaveLength(1)
      expect(result.snapshots[0].releaseLineConfig).toBeUndefined()
    })
  })
})