/**
 * Tests for release line configuration methods in SimpleDataService
 */

import { simpleDataService } from '../simpleDataService'
import * as supabaseService from '../supabaseService'
import type { ReleaseLineConfig } from '@/components/HillChartApp'

// Mock the supabase service
jest.mock('../supabaseService')

const mockSupabaseService = supabaseService as jest.Mocked<typeof supabaseService>

describe('SimpleDataService - Release Line Configuration', () => {
  const userId = 'test-user-id'
  const collectionId = 'test-collection-id'
  
  const mockReleaseLineConfig: ReleaseLineConfig = {
    enabled: true,
    color: '#ff00ff',
    text: 'Q4 2024'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateCollectionReleaseLineConfig', () => {
    it('should call supabase service with correct parameters', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      const result = await simpleDataService.updateCollectionReleaseLineConfig(
        userId,
        collectionId,
        mockReleaseLineConfig
      )

      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledWith(
        userId,
        collectionId,
        mockReleaseLineConfig
      )
      expect(result).toBe(true)
    })

    it('should return false when supabase service fails', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(false)

      const result = await simpleDataService.updateCollectionReleaseLineConfig(
        userId,
        collectionId,
        mockReleaseLineConfig
      )

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockSupabaseService.updateCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        simpleDataService.updateCollectionReleaseLineConfig(
          userId,
          collectionId,
          mockReleaseLineConfig
        )
      ).rejects.toThrow('Database error')
    })
  })

  describe('getCollectionReleaseLineConfig', () => {
    it('should call supabase service with correct parameters', async () => {
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(mockReleaseLineConfig)

      const result = await simpleDataService.getCollectionReleaseLineConfig(
        userId,
        collectionId
      )

      expect(mockSupabaseService.getCollectionReleaseLineConfig).toHaveBeenCalledWith(
        userId,
        collectionId
      )
      expect(result).toEqual(mockReleaseLineConfig)
    })

    it('should return null when no config exists', async () => {
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(null)

      const result = await simpleDataService.getCollectionReleaseLineConfig(
        userId,
        collectionId
      )

      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockSupabaseService.getCollectionReleaseLineConfig.mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        simpleDataService.getCollectionReleaseLineConfig(userId, collectionId)
      ).rejects.toThrow('Database error')
    })
  })

  describe('exported functions', () => {
    it('should export updateCollectionReleaseLineConfig function', async () => {
      const { updateCollectionReleaseLineConfig } = await import('../simpleDataService')
      
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      const result = await updateCollectionReleaseLineConfig(
        userId,
        collectionId,
        mockReleaseLineConfig
      )

      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledWith(
        userId,
        collectionId,
        mockReleaseLineConfig
      )
      expect(result).toBe(true)
    })

    it('should export getCollectionReleaseLineConfig function', async () => {
      const { getCollectionReleaseLineConfig } = await import('../simpleDataService')
      
      mockSupabaseService.getCollectionReleaseLineConfig.mockResolvedValue(mockReleaseLineConfig)

      const result = await getCollectionReleaseLineConfig(userId, collectionId)

      expect(mockSupabaseService.getCollectionReleaseLineConfig).toHaveBeenCalledWith(
        userId,
        collectionId
      )
      expect(result).toEqual(mockReleaseLineConfig)
    })
  })

  describe('integration with existing collection methods', () => {
    it('should work alongside existing collection operations', async () => {
      // Test that release line operations don't interfere with existing methods
      mockSupabaseService.fetchCollections.mockResolvedValue([])
      mockSupabaseService.updateCollectionReleaseLineConfig.mockResolvedValue(true)

      // Fetch collections first
      const collections = await simpleDataService.fetchCollections(userId)
      expect(collections).toEqual([])

      // Then update release line config
      const updateResult = await simpleDataService.updateCollectionReleaseLineConfig(
        userId,
        collectionId,
        mockReleaseLineConfig
      )
      expect(updateResult).toBe(true)

      // Verify both calls were made
      expect(mockSupabaseService.fetchCollections).toHaveBeenCalledWith(userId, false)
      expect(mockSupabaseService.updateCollectionReleaseLineConfig).toHaveBeenCalledWith(
        userId,
        collectionId,
        mockReleaseLineConfig
      )
    })
  })
})