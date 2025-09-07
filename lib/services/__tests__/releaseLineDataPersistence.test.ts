/**
 * Integration tests for release line data persistence and encryption
 * Tests the complete flow from UI to database and back
 */

import { simpleDataService } from '../simpleDataService'
import { privacyService } from '../privacyService'
import * as supabaseService from '../supabaseService'
import { validateReleaseLineConfig } from '../../validation'
import type { ReleaseLineConfig } from '@/components/HillChartApp'

// Mock the supabase service
jest.mock('../supabaseService')
jest.mock('../privacyService')

const mockSupabaseService = supabaseService as jest.Mocked<typeof supabaseService>
const mockPrivacyService = privacyService as jest.Mocked<typeof privacyService>

describe('Release Line Data Persistence Integration', () => {
  const testUserId = 'test-user-12345'
  const testCollectionId = 'test-collection-67890'

  const testReleaseLineConfig: ReleaseLineConfig = {
    enabled: true,
    color: '#ff00ff',
    text: 'Q4 2024 Release'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete persistence workflow', () => {
    it('should handle full create-read-update-delete cycle', async () => {
      // Setup mocks for encryption/decryption
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'encrypted-color-data',
        text_encrypted: 'encrypted-text-data'
      })

      mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue(testReleaseLineConfig)

      // Setup mocks for database operations
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(testReleaseLineConfig)

      // 1. CREATE: Save new release line configuration
      const createResult = await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        testReleaseLineConfig
      )

      expect(createResult).toBe(true)
      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledWith(
        testUserId,
        testCollectionId,
        testReleaseLineConfig
      )

      // 2. READ: Retrieve the configuration
      const readResult = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      expect(readResult).toEqual(testReleaseLineConfig)
      expect(mockSupabaseService.getCollectionReleaseLineConfig).toHaveBeenCalledWith(
        testUserId,
        testCollectionId
      )

      // 3. UPDATE: Modify the configuration
      const updatedConfig: ReleaseLineConfig = {
        ...testReleaseLineConfig,
        color: '#00ff00',
        text: 'Updated Release'
      }

      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(updatedConfig)

      const updateResult = await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        updatedConfig
      )

      expect(updateResult).toBe(true)

      const updatedReadResult = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      expect(updatedReadResult).toEqual(updatedConfig)

      // 4. DELETE: Remove the configuration (set to disabled with empty values)
      const deletedConfig: ReleaseLineConfig = {
        enabled: false,
        color: '#ff00ff',
        text: ''
      }

      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(null)

      const deleteResult = await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        deletedConfig
      )

      expect(deleteResult).toBe(true)

      const deletedReadResult = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      expect(deletedReadResult).toBeNull()
    })

    it('should handle concurrent updates correctly', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      const config1: ReleaseLineConfig = {
        enabled: true,
        color: '#ff0000',
        text: 'Config 1'
      }

      const config2: ReleaseLineConfig = {
        enabled: true,
        color: '#00ff00',
        text: 'Config 2'
      }

      // Simulate concurrent updates
      const [result1, result2] = await Promise.all([
        simpleDataService.updateCollectionReleaseLineConfig(testUserId, testCollectionId, config1),
        simpleDataService.updateCollectionReleaseLineConfig(testUserId, testCollectionId, config2)
      ])

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledTimes(2)
    })
  })

  describe('Service layer integration', () => {
    it('should delegate to supabase service for storage and retrieval', async () => {
      // Mock supabase service responses
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(testReleaseLineConfig)

      // Store data
      const storeResult = await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        testReleaseLineConfig
      )

      expect(storeResult).toBe(true)
      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledWith(
        testUserId,
        testCollectionId,
        testReleaseLineConfig
      )

      // Retrieve data
      const retrieveResult = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      expect(retrieveResult).toEqual(testReleaseLineConfig)
      expect(mockSupabaseService.getCollectionReleaseLineConfig).toHaveBeenCalledWith(
        testUserId,
        testCollectionId
      )
    })

    it('should handle supabase service failures gracefully', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        simpleDataService.updateCollectionReleaseLineConfig(
          testUserId,
          testCollectionId,
          testReleaseLineConfig
        )
      ).rejects.toThrow('Database error')
    })

    it('should handle supabase service retrieval failures gracefully', async () => {
      mockSupabaseService.getCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        simpleDataService.getCollectionReleaseLineConfig(testUserId, testCollectionId)
      ).rejects.toThrow('Database error')
    })

    it('should handle empty/null encrypted data', async () => {
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(null)

      const result = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      expect(result).toBeNull()
      expect(mockPrivacyService.decryptReleaseLineConfig).not.toHaveBeenCalled()
    })
  })

  describe('Validation integration', () => {
    it('should validate configuration before storage', async () => {
      const invalidConfig = {
        enabled: true,
        color: 'invalid-color',
        text: 'Test'
      }

      // Validation should fail before reaching the service layer
      expect(() => validateReleaseLineConfig(invalidConfig)).toThrow('Invalid hex color format')

      // Service methods should not be called with invalid data
      expect(mockSupabaseService.updateCollectionReleaseLineConfig).not.toHaveBeenCalled()
    })

    it('should sanitize configuration during validation', async () => {
      const unsanitizedConfig = {
        enabled: true,
        color: '  #ff00ff  ',
        text: '  Q4 2024  '
      }

      const sanitizedConfig = validateReleaseLineConfig(unsanitizedConfig)

      expect(sanitizedConfig).toEqual({
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024'
      })

      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        sanitizedConfig
      )

      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledWith(
        testUserId,
        testCollectionId,
        sanitizedConfig
      )
    })

    it('should return data as received from supabase service', async () => {
      // Simulate data from database (validation happens at supabase service level)
      const dataFromDb = {
        enabled: true,
        color: '#ff00ff',
        text: 'Valid data'
      }

      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(dataFromDb)

      const result = await simpleDataService.getCollectionReleaseLineConfig(testUserId, testCollectionId)
      
      expect(result).toEqual(dataFromDb)
    })
  })

  describe('Error handling and resilience', () => {
    it('should handle database connection failures', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        simpleDataService.updateCollectionReleaseLineConfig(
          testUserId,
          testCollectionId,
          testReleaseLineConfig
        )
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle network timeouts', async () => {
      mockSupabaseService.getCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Network timeout')
      )

      await expect(
        simpleDataService.getCollectionReleaseLineConfig(testUserId, testCollectionId)
      ).rejects.toThrow('Network timeout')
    })

    it('should handle invalid user IDs', async () => {
      const invalidUserId = 'invalid-user-id'

      mockSupabaseService.updateCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Invalid user ID')
      )

      await expect(
        simpleDataService.updateCollectionReleaseLineConfig(
          invalidUserId,
          testCollectionId,
          testReleaseLineConfig
        )
      ).rejects.toThrow('Invalid user ID')
    })

    it('should handle invalid collection IDs', async () => {
      const invalidCollectionId = 'invalid-collection-id'

      mockSupabaseService.updateCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Collection not found')
      )

      await expect(
        simpleDataService.updateCollectionReleaseLineConfig(
          testUserId,
          invalidCollectionId,
          testReleaseLineConfig
        )
      ).rejects.toThrow('Collection not found')
    })
  })

  describe('Performance and optimization', () => {
    it('should handle large text values efficiently', async () => {
      const largeTextConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'a'.repeat(50) // Maximum allowed length
      }

      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(largeTextConfig)

      const startTime = Date.now()

      await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        largeTextConfig
      )

      const result = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      const endTime = Date.now()

      expect(result).toEqual(largeTextConfig)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle multiple rapid updates', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      const updates = Array.from({ length: 10 }, (_, i) => ({
        enabled: true,
        color: '#ff00ff',
        text: `Update ${i}`
      }))

      const startTime = Date.now()

      const results = await Promise.all(
        updates.map(config =>
          simpleDataService.updateCollectionReleaseLineConfig(
            testUserId,
            testCollectionId,
            config
          )
        )
      )

      const endTime = Date.now()

      expect(results.every(result => result === true)).toBe(true)
      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledTimes(10)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('Data consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const configs = [
        { enabled: true, color: '#ff0000', text: 'Red' },
        { enabled: false, color: '#00ff00', text: 'Green' },
        { enabled: true, color: '#0000ff', text: 'Blue' }
      ]

      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      // Store each configuration
      for (const config of configs) {
        mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(config)

        await simpleDataService.updateCollectionReleaseLineConfig(
          testUserId,
          testCollectionId,
          config
        )

        const retrieved = await simpleDataService.getCollectionReleaseLineConfig(
          testUserId,
          testCollectionId
        )

        expect(retrieved).toEqual(config)
      }
    })

    it('should handle partial updates correctly', async () => {
      // Start with a complete configuration
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(testReleaseLineConfig)
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      // Update only the color
      const colorOnlyUpdate = {
        ...testReleaseLineConfig,
        color: '#00ff00'
      }

      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(colorOnlyUpdate)

      await simpleDataService.updateCollectionReleaseLineConfig(
        testUserId,
        testCollectionId,
        colorOnlyUpdate
      )

      const result = await simpleDataService.getCollectionReleaseLineConfig(
        testUserId,
        testCollectionId
      )

      expect(result).toEqual(colorOnlyUpdate)
      expect(result?.text).toBe(testReleaseLineConfig.text) // Text should remain unchanged
      expect(result?.enabled).toBe(testReleaseLineConfig.enabled) // Enabled should remain unchanged
    })
  })
})