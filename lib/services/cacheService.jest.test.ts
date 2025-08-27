/**
 * Jest Test Suite for CacheManager
 * 
 * Comprehensive unit tests covering TTL expiration, pattern invalidation,
 * cascade invalidation, storage fallback, metadata persistence, and cleanup operations.
 */

import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { beforeEach } from 'node:test'
import { CacheManager, CacheEntry, CacheMetadata } from './cacheService'

// Mock the invalidation rules module
jest.mock('./cacheInvalidationRules', () => ({
  getInvalidationRuleManager: () => ({
    getInvalidationPatterns: jest.fn().mockReturnValue(['*:collections*', '*:collection:*']),
  }),
}))

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
}

// Mock storage data
const mockStorageData = new Map<string, string>()

// Setup mocks
beforeAll(() => {
  // Mock global IndexedDB
  Object.defineProperty(global, 'indexedDB', {
    value: mockIndexedDB,
    writable: true,
  })

  // Mock global localStorage
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
})

beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks()
  mockStorageData.clear()

  // Setup localStorage mock behavior
  mockLocalStorage.getItem.mockImplementation((key: string) => {
    return mockStorageData.get(key) || null
  })

  mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
    mockStorageData.set(key, value)
  })

  mockLocalStorage.removeItem.mockImplementation((key: string) => {
    mockStorageData.delete(key)
  })

  mockLocalStorage.clear.mockImplementation(() => {
    mockStorageData.clear()
  })

  // Mock Object.keys for localStorage
  Object.defineProperty(mockLocalStorage, 'length', {
    get: () => mockStorageData.size,
  })

  // Mock console methods to avoid noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('CacheManager', () => {
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheManager = new CacheManager({
      defaultTTL: 1000, // 1 second for testing
      storagePrefix: 'test_cache_',
      cleanupInterval: 100, // 100ms for testing
    })
  })

  afterEach(() => {
    cacheManager.destroy()
  })

  describe('TTL-based expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should expire entries after TTL', async () => {
      const testData = { id: '1', name: 'Test' }
      const key = 'test:key'
      const ttl = 500

      // Set data with short TTL
      await cacheManager.set(key, testData, ttl)

      // Should be available immediately
      let result = await cacheManager.get(key)
      expect(result).toEqual(testData)

      // Advance time past TTL
      jest.advanceTimersByTime(ttl + 100)

      // Should be expired
      result = await cacheManager.get(key)
      expect(result).toBeNull()
    })

    it('should detect stale entries correctly', async () => {
      const testData = { id: '1', name: 'Test' }
      const key = 'test:key'
      const ttl = 500

      await cacheManager.set(key, testData, ttl)

      // Should not be stale initially
      let isStale = await cacheManager.isStale(key)
      expect(isStale).toBe(false)

      let isFresh = await cacheManager.validateFreshness(key)
      expect(isFresh).toBe(true)

      // Advance time past TTL
      jest.advanceTimersByTime(ttl + 100)

      // Should be stale now
      isStale = await cacheManager.isStale(key)
      expect(isStale).toBe(true)

      isFresh = await cacheManager.validateFreshness(key)
      expect(isFresh).toBe(false)
    })

    it('should handle non-existent keys as stale', async () => {
      const isStale = await cacheManager.isStale('non-existent')
      const isFresh = await cacheManager.validateFreshness('non-existent')

      expect(isStale).toBe(true)
      expect(isFresh).toBe(false)
    })
  })

  describe('Pattern-based invalidation', () => {
    it('should invalidate keys matching wildcard patterns', async () => {
      const testData = { id: '1', name: 'Test' }

      // Set multiple keys
      await cacheManager.set('user:123:collections:active', testData)
      await cacheManager.set('user:123:collections:archived', testData)
      await cacheManager.set('user:123:dots:collection-1', testData)
      await cacheManager.set('user:456:collections:active', testData)

      // Invalidate pattern
      await cacheManager.invalidatePattern('user:123:collections:*')

      // Check results
      const result1 = await cacheManager.get('user:123:collections:active')
      const result2 = await cacheManager.get('user:123:collections:archived')
      const result3 = await cacheManager.get('user:123:dots:collection-1')
      const result4 = await cacheManager.get('user:456:collections:active')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(result3).toEqual(testData) // Should remain
      expect(result4).toEqual(testData) // Should remain
    })

    it('should invalidate all user data', async () => {
      const testData = { id: '1', name: 'Test' }

      await cacheManager.set('user:123:collections', testData)
      await cacheManager.set('user:123:dots', testData)
      await cacheManager.set('user:456:collections', testData)

      await cacheManager.invalidateUser('123')

      const result1 = await cacheManager.get('user:123:collections')
      const result2 = await cacheManager.get('user:123:dots')
      const result3 = await cacheManager.get('user:456:collections')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(result3).toEqual(testData) // Should remain
    })

    it('should handle pattern conversion correctly', async () => {
      const testData = { id: '1', name: 'Test' }

      await cacheManager.set('test.file.txt', testData)
      await cacheManager.set('test-file-txt', testData)
      await cacheManager.set('testXfileXtxt', testData)

      // Test single character wildcard
      await cacheManager.invalidatePattern('test?file?txt')

      const result1 = await cacheManager.get('test.file.txt')
      const result2 = await cacheManager.get('test-file-txt')
      const result3 = await cacheManager.get('testXfileXtxt')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(result3).toBeNull()
    })
  })

  describe('Cascade invalidation', () => {
    it('should cascade invalidate collection-related data', async () => {
      const testData = { id: '1', name: 'Test' }
      const collectionId = 'collection-123'

      // Set related data
      await cacheManager.set(`user:123:collection:${collectionId}`, testData)
      await cacheManager.set(`user:123:dots:${collectionId}`, testData)
      await cacheManager.set(`user:123:snapshots:${collectionId}`, testData)
      await cacheManager.set('user:123:collections', testData)

      // Invalidate with cascade
      await cacheManager.invalidateWithCascade(
        `user:123:collection:${collectionId}`,
        'collection',
        collectionId
      )

      // Check cascade invalidation
      const collectionResult = await cacheManager.get(`user:123:collection:${collectionId}`)
      const collectionsResult = await cacheManager.get('user:123:collections')

      expect(collectionResult).toBeNull()
      expect(collectionsResult).toBeNull()
    })

    it('should cascade invalidate dot-related data', async () => {
      const testData = { id: '1', name: 'Test' }
      const dotId = 'dot-123'

      await cacheManager.set(`user:123:dot:${dotId}`, testData)
      await cacheManager.set(`user:123:collection:contains-${dotId}`, testData)
      await cacheManager.set('user:123:collections', testData)

      await cacheManager.invalidateWithCascade(
        `user:123:dot:${dotId}`,
        'dot',
        dotId
      )

      const collectionsResult = await cacheManager.get('user:123:collections')
      expect(collectionsResult).toBeNull()
    })

    it('should not cascade for snapshot entities', async () => {
      const testData = { id: '1', name: 'Test' }
      const snapshotId = 'snapshot-123'

      await cacheManager.set(`user:123:snapshot:${snapshotId}`, testData)
      await cacheManager.set('user:123:collections', testData)

      await cacheManager.invalidateWithCascade(
        `user:123:snapshot:${snapshotId}`,
        'snapshot',
        snapshotId
      )

      // Collections should remain (no cascade for snapshots)
      const collectionsResult = await cacheManager.get('user:123:collections')
      expect(collectionsResult).toEqual(testData)
    })
  })

  describe('Storage fallback', () => {
    it('should fall back to localStorage when IndexedDB fails', async () => {
      // Create a new cache manager that will trigger IndexedDB initialization
      const failingCacheManager = new CacheManager({
        defaultTTL: 1000,
        storagePrefix: 'failing_cache_',
      })

      const testData = { id: '1', name: 'Test' }
      const key = 'test:key'

      // This should fall back to localStorage when IndexedDB operations fail
      await failingCacheManager.set(key, testData)

      // Should be able to retrieve data (either from IndexedDB or localStorage fallback)
      const result = await failingCacheManager.get(key)
      expect(result).toEqual(testData)

      failingCacheManager.destroy()
    })

    it('should handle corrupted localStorage data gracefully', async () => {
      const key = 'test:key'
      
      // Set corrupted data directly in mock storage
      mockStorageData.set(`test_cache_${key}`, 'invalid-json')

      const result = await cacheManager.get(key)
      expect(result).toBeNull()

      // Should log error
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Metadata persistence', () => {
    it('should save and load metadata correctly', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'

      await cacheManager.updateMetadata({
        userId,
        sessionId,
        lastSync: Date.now(),
      })

      // Create new cache manager instance
      const newCacheManager = new CacheManager({
        storagePrefix: 'test_cache_',
      })

      // Wait for metadata to load
      await new Promise(resolve => setTimeout(resolve, 10))

      // Metadata should be persisted
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test_cache_metadata')

      newCacheManager.destroy()
    })

    it('should handle missing metadata gracefully', async () => {
      // Clear any existing metadata
      mockStorageData.delete('test_cache_metadata')

      const newCacheManager = new CacheManager({
        storagePrefix: 'test_cache_',
      })

      // Should create default metadata
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test_cache_metadata',
        expect.stringContaining('"version":"1.0.0"')
      )

      newCacheManager.destroy()
    })

    it('should handle corrupted metadata', async () => {
      // Set corrupted metadata
      mockStorageData.set('test_cache_metadata', 'invalid-json')

      const newCacheManager = new CacheManager({
        storagePrefix: 'test_cache_',
      })

      // Should handle gracefully and create new metadata
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load metadata'),
        expect.any(Error)
      )

      newCacheManager.destroy()
    })
  })

  describe('Cleanup operations', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should clean up expired entries automatically', async () => {
      const testData = { id: '1', name: 'Test' }
      const shortTTL = 100
      const longTTL = 10000

      // Set data with different TTLs
      await cacheManager.set('short-lived', testData, shortTTL)
      await cacheManager.set('long-lived', testData, longTTL)

      // Advance time to expire short-lived entry
      jest.advanceTimersByTime(shortTTL + 50)

      // Trigger cleanup interval
      jest.advanceTimersByTime(100) // cleanup interval

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      // Short-lived should be cleaned up, long-lived should remain
      const shortResult = await cacheManager.get('short-lived')
      const longResult = await cacheManager.get('long-lived')

      expect(shortResult).toBeNull()
      expect(longResult).toEqual(testData)
    })

    it('should refresh stale data manually', async () => {
      const testData = { id: '1', name: 'Test' }
      const shortTTL = 100

      await cacheManager.set('stale-key', testData, shortTTL)
      await cacheManager.set('fresh-key', testData, 10000)

      // Advance time to make first entry stale
      jest.advanceTimersByTime(shortTTL + 50)

      // Manually refresh stale data
      await cacheManager.refreshStaleData()

      const staleResult = await cacheManager.get('stale-key')
      const freshResult = await cacheManager.get('fresh-key')

      expect(staleResult).toBeNull()
      expect(freshResult).toEqual(testData)
    })

    it('should handle cleanup of corrupted entries', async () => {
      // Set valid data
      const testData = { id: '1', name: 'Test' }
      await cacheManager.set('valid-key', testData)

      // Manually add corrupted data
      mockStorageData.set('test_cache_corrupted-key', 'invalid-json')

      // Trigger cleanup
      await cacheManager.refreshStaleData()

      // Corrupted entry should be removed
      expect(mockStorageData.has('test_cache_corrupted-key')).toBe(false)
      
      // Valid entry should remain
      const validResult = await cacheManager.get('valid-key')
      expect(validResult).toEqual(testData)
    })

    it('should destroy cleanup timer properly', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      
      cacheManager.destroy()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('Rule-based invalidation', () => {
    it('should invalidate by operation rules', async () => {
      const testData = { id: '1', name: 'Test' }
      const userId = '123'
      const collectionId = 'collection-456'

      // Set up cache entries
      await cacheManager.set(`user:${userId}:collections`, testData)
      await cacheManager.set(`user:${userId}:collection:${collectionId}`, testData)

      // Invalidate using operation
      await cacheManager.invalidateByOperation('collection:update', userId, collectionId, 'collection')

      // Should invalidate related entries
      const collectionsResult = await cacheManager.get(`user:${userId}:collections`)
      expect(collectionsResult).toBeNull()
    })

    it('should handle operation invalidation without entity type', async () => {
      const testData = { id: '1', name: 'Test' }
      const userId = '123'

      await cacheManager.set(`user:${userId}:collections`, testData)

      // Should not throw error
      await expect(
        cacheManager.invalidateByOperation('generic:operation', userId)
      ).resolves.not.toThrow()
    })
  })

  describe('Session invalidation', () => {
    it('should invalidate all cache for session', async () => {
      const testData = { id: '1', name: 'Test' }
      const sessionId = 'session-123'

      await cacheManager.set('key1', testData)
      await cacheManager.set('key2', testData)

      await cacheManager.invalidateSession(sessionId)

      // All non-metadata keys should be removed
      const result1 = await cacheManager.get('key1')
      const result2 = await cacheManager.get('key2')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })

    it('should handle session invalidation with corrupted entries', async () => {
      // Add corrupted entry
      mockStorageData.set('test_cache_corrupted', 'invalid-json')

      // Should not throw
      await expect(
        cacheManager.invalidateSession('session-123')
      ).resolves.not.toThrow()

      // Corrupted entry should be removed
      expect(mockStorageData.has('test_cache_corrupted')).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock storage to throw errors
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const result = await cacheManager.get('test-key')
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle set operation errors', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })

      // Should not throw
      await expect(
        cacheManager.set('test-key', { data: 'test' })
      ).resolves.not.toThrow()

      expect(console.error).toHaveBeenCalled()
    })

    it('should handle invalidation errors', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove error')
      })

      // Should not throw
      await expect(
        cacheManager.invalidate('test-key')
      ).resolves.not.toThrow()

      expect(console.error).toHaveBeenCalled()
    })
  })
})