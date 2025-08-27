/**
 * Cached Data Service - Cache-aware wrapper for Supabase operations
 * 
 * Provides cache-first data fetching with fallback to database,
 * automatic cache invalidation on mutations, and force refresh capabilities.
 */

import { getCacheManager } from './cacheService'
import * as supabaseService from './supabaseService'
import { Collection, Dot, Snapshot, ExportData } from '@/components/HillChartApp'

// User preferences interface
export interface UserPreferences {
  selectedCollectionId: string | null
  collectionInput: string
  hideCollectionName: boolean
  copyFormat: 'PNG' | 'SVG'
  createdAt: string
  updatedAt: string
}

// Cache key generators
const CacheKeys = {
  collections: (userId: string, includeArchived: boolean = false) =>
    `user:${userId}:collections${includeArchived ? ':archived' : ''}`,

  collection: (userId: string, collectionId: string) =>
    `user:${userId}:collection:${collectionId}`,

  snapshots: (userId: string) =>
    `user:${userId}:snapshots`,

  userPreferences: (userId: string) =>
    `user:${userId}:preferences`,

  collectionDots: (userId: string, collectionId: string) =>
    `user:${userId}:collection:${collectionId}:dots`
}

// Cache TTL configurations (in milliseconds)
const CacheTTL = {
  collections: 5 * 60 * 1000,      // 5 minutes
  snapshots: 10 * 60 * 1000,       // 10 minutes  
  userPreferences: 30 * 60 * 1000,  // 30 minutes
  shortLived: 2 * 60 * 1000         // 2 minutes for frequently changing data
}

// Options for data fetching
export interface FetchOptions {
  forceRefresh?: boolean
  useCache?: boolean
  ttl?: number
}

/**
 * Cache-aware data service that wraps Supabase operations
 */
export class CachedDataService {
  private cacheManager = getCacheManager()

  // Collections operations
  async fetchCollections(
    userId: string,
    includeArchived: boolean = false,
    options: FetchOptions = {}
  ): Promise<Collection[]> {
    const { forceRefresh = false, useCache = true, ttl = CacheTTL.collections } = options
    const cacheKey = CacheKeys.collections(userId, includeArchived)

    try {
      // Check cache first unless force refresh is requested
      if (useCache && !forceRefresh) {
        const cached = await this.cacheManager.get<Collection[]>(cacheKey)
        if (cached) {
          console.log(`[CACHED_DATA] Cache hit for collections: ${cacheKey}`)
          return cached
        }
      }

      // Fetch from database
      console.log(`[CACHED_DATA] Fetching collections from database: ${cacheKey}`)
      const collections = await supabaseService.fetchCollections(userId, includeArchived)

      // Cache the result
      if (useCache) {
        await this.cacheManager.set(cacheKey, collections, ttl)
      }

      return collections
    } catch (error) {
      console.error('[CACHED_DATA] Failed to fetch collections:', error)

      // Try to return stale cache data as fallback
      if (useCache) {
        const staleData = await this.cacheManager.get<Collection[]>(cacheKey)
        if (staleData) {
          console.warn('[CACHED_DATA] Returning stale cache data for collections')
          return staleData
        }
      }

      throw error
    }
  }

  async addCollection(collection: Collection, userId: string): Promise<Collection | null> {
    try {
      const result = await supabaseService.addCollection(collection, userId)

      if (result) {
        // Invalidate collections cache
        await this.cacheManager.invalidateByOperation('collection:create', userId, collection.id, 'collection')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to add collection:', error)
      throw error
    }
  }

  async updateCollection(collectionId: string, newName: string, userId: string): Promise<boolean> {
    try {
      const result = await supabaseService.updateCollection(collectionId, newName, userId)

      if (result) {
        // Invalidate related cache entries
        await this.cacheManager.invalidateByOperation('collection:update', userId, collectionId, 'collection')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to update collection:', error)
      throw error
    }
  }

  async archiveCollection(collectionId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabaseService.archiveCollection(collectionId, userId)

      if (result) {
        // Invalidate collections cache (both regular and archived views)
        await this.cacheManager.invalidateByOperation('collection:archive', userId, collectionId, 'collection')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to archive collection:', error)
      throw error
    }
  }

  async unarchiveCollection(collectionId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabaseService.unarchiveCollection(collectionId, userId)

      if (result) {
        // Invalidate collections cache (both regular and archived views)
        await this.cacheManager.invalidateByOperation('collection:unarchive', userId, collectionId, 'collection')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to unarchive collection:', error)
      throw error
    }
  }

  async deleteCollection(collectionId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabaseService.deleteCollection(collectionId, userId)

      if (result) {
        // Invalidate all related cache entries
        await this.cacheManager.invalidateByOperation('collection:delete', userId, collectionId, 'collection')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to delete collection:', error)
      throw error
    }
  }

  // Dot operations
  async addDot(dot: Dot, collectionId: string, userId: string): Promise<Dot | null> {
    try {
      const result = await supabaseService.addDot(dot, collectionId, userId)

      if (result) {
        // Invalidate collection and dots cache
        await this.cacheManager.invalidateByOperation('dot:create', userId, dot.id, 'dot')

        // Also invalidate the specific collection cache
        const collectionCacheKey = CacheKeys.collection(userId, collectionId)
        await this.cacheManager.invalidate(collectionCacheKey)
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to add dot:', error)
      throw error
    }
  }

  async updateDot(dot: Dot, userId: string): Promise<Dot | null> {
    try {
      const result = await supabaseService.updateDot(dot, userId)

      if (result) {
        // Invalidate dot-related cache
        await this.cacheManager.invalidateByOperation('dot:update', userId, dot.id, 'dot')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to update dot:', error)
      throw error
    }
  }

  async deleteDot(dotId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const result = await supabaseService.deleteDot(dotId, userId)

      if (result.success) {
        // Invalidate dot-related cache
        await this.cacheManager.invalidateByOperation('dot:delete', userId, dotId, 'dot')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to delete dot:', error)
      throw error
    }
  }

  // Snapshot operations
  async createSnapshot(
    userId: string,
    collectionId: string,
    collectionName: string,
    dots: Dot[]
  ): Promise<boolean> {
    try {
      const result = await supabaseService.createSnapshot(userId, collectionId, collectionName, dots)

      if (result) {
        // Invalidate snapshots cache
        await this.cacheManager.invalidateByOperation('snapshot:create', userId, collectionId, 'snapshot')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to create snapshot:', error)
      throw error
    }
  }

  async fetchSnapshots(userId: string, options: FetchOptions = {}): Promise<Snapshot[]> {
    const { forceRefresh = false, useCache = true, ttl = CacheTTL.snapshots } = options
    const cacheKey = CacheKeys.snapshots(userId)

    try {
      // Check cache first unless force refresh is requested
      if (useCache && !forceRefresh) {
        const cached = await this.cacheManager.get<Snapshot[]>(cacheKey)
        if (cached) {
          console.log(`[CACHED_DATA] Cache hit for snapshots: ${cacheKey}`)
          return cached
        }
      }

      // Fetch from database
      console.log(`[CACHED_DATA] Fetching snapshots from database: ${cacheKey}`)
      const snapshots = await supabaseService.fetchSnapshots(userId)

      // Cache the result
      if (useCache) {
        await this.cacheManager.set(cacheKey, snapshots, ttl)
      }

      return snapshots
    } catch (error) {
      console.error('[CACHED_DATA] Failed to fetch snapshots:', error)

      // Try to return stale cache data as fallback
      if (useCache) {
        const staleData = await this.cacheManager.get<Snapshot[]>(cacheKey)
        if (staleData) {
          console.warn('[CACHED_DATA] Returning stale cache data for snapshots')
          return staleData
        }
      }

      throw error
    }
  }

  async loadSnapshot(userId: string, snapshotId: string): Promise<Snapshot | null> {
    try {
      // Snapshots are typically loaded once, so we don't cache individual snapshots
      // but we could add caching here if needed
      return await supabaseService.loadSnapshot(userId, snapshotId)
    } catch (error) {
      console.error('[CACHED_DATA] Failed to load snapshot:', error)
      throw error
    }
  }

  async deleteSnapshot(userId: string, snapshotId: string): Promise<boolean> {
    try {
      const result = await supabaseService.deleteSnapshot(userId, snapshotId)

      if (result) {
        // Invalidate snapshots cache
        await this.cacheManager.invalidateByOperation('snapshot:delete', userId, snapshotId, 'snapshot')
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to delete snapshot:', error)
      throw error
    }
  }

  // User preferences operations
  async fetchUserPreferences(userId: string, options: FetchOptions = {}): Promise<UserPreferences | null> {
    const { forceRefresh = false, useCache = true, ttl = CacheTTL.userPreferences } = options
    const cacheKey = CacheKeys.userPreferences(userId)

    try {
      // Check cache first unless force refresh is requested
      if (useCache && !forceRefresh) {
        const cached = await this.cacheManager.get<UserPreferences>(cacheKey)
        if (cached) {
          console.log(`[CACHED_DATA] Cache hit for user preferences: ${cacheKey}`)
          return cached
        }
      }

      // Fetch from database
      console.log(`[CACHED_DATA] Fetching user preferences from database: ${cacheKey}`)
      const preferences = await supabaseService.fetchUserPreferences(userId)

      // Cache the result
      if (useCache && preferences) {
        await this.cacheManager.set<UserPreferences>(cacheKey, preferences, ttl)
      }

      return preferences
    } catch (error) {
      console.error('[CACHED_DATA] Failed to fetch user preferences:', error)

      // Try to return stale cache data as fallback
      if (useCache) {
        const staleData = await this.cacheManager.get<UserPreferences>(cacheKey)
        if (staleData) {
          console.warn('[CACHED_DATA] Returning stale cache data for user preferences')
          return staleData
        }
      }

      throw error
    }
  }

  // Import/Export operations
  async importData(data: ExportData, userId: string): Promise<Collection[]> {
    try {
      const result = await supabaseService.importData(data, userId)

      if (result.length > 0) {
        // Invalidate all user cache since import affects multiple entities
        await this.cacheManager.invalidateUser(userId)
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to import data:', error)
      throw error
    }
  }

  async resetAllCollections(userId: string): Promise<boolean> {
    try {
      const result = await supabaseService.resetAllCollections(userId)

      if (result) {
        // Clear all user cache
        await this.cacheManager.invalidateUser(userId)
      }

      return result
    } catch (error) {
      console.error('[CACHED_DATA] Failed to reset collections:', error)
      throw error
    }
  }

  // Cache management utilities
  async refreshCache(userId: string): Promise<void> {
    try {
      console.log(`[CACHED_DATA] Refreshing cache for user: ${userId}`)

      // Invalidate all user cache
      await this.cacheManager.invalidateUser(userId)

      // Pre-populate cache with fresh data
      await this.fetchCollections(userId, false, { forceRefresh: true })
      await this.fetchSnapshots(userId, { forceRefresh: true })
      await this.fetchUserPreferences(userId, { forceRefresh: true })

      console.log(`[CACHED_DATA] Cache refresh complete for user: ${userId}`)
    } catch (error) {
      console.error('[CACHED_DATA] Failed to refresh cache:', error)
      throw error
    }
  }

  async clearUserCache(userId: string): Promise<void> {
    try {
      await this.cacheManager.invalidateUser(userId)
      console.log(`[CACHED_DATA] Cleared cache for user: ${userId}`)
    } catch (error) {
      console.error('[CACHED_DATA] Failed to clear user cache:', error)
      throw error
    }
  }

  async validateCacheFreshness(userId: string): Promise<{
    collections: boolean
    snapshots: boolean
    preferences: boolean
  }> {
    try {
      const [collectionsValid, snapshotsValid, preferencesValid] = await Promise.all([
        this.cacheManager.validateFreshness(CacheKeys.collections(userId)),
        this.cacheManager.validateFreshness(CacheKeys.snapshots(userId)),
        this.cacheManager.validateFreshness(CacheKeys.userPreferences(userId))
      ])

      return {
        collections: collectionsValid,
        snapshots: snapshotsValid,
        preferences: preferencesValid
      }
    } catch (error) {
      console.error('[CACHED_DATA] Failed to validate cache freshness:', error)
      return {
        collections: false,
        snapshots: false,
        preferences: false
      }
    }
  }
}

// Singleton instance
let cachedDataServiceInstance: CachedDataService | null = null

export const getCachedDataService = (): CachedDataService => {
  if (!cachedDataServiceInstance) {
    cachedDataServiceInstance = new CachedDataService()
  }
  return cachedDataServiceInstance
}

// Export individual functions for backward compatibility with preserved method binding
const cachedDataService = getCachedDataService()

export const fetchCollections = cachedDataService.fetchCollections.bind(cachedDataService)
export const addCollection = cachedDataService.addCollection.bind(cachedDataService)
export const updateCollection = cachedDataService.updateCollection.bind(cachedDataService)
export const archiveCollection = cachedDataService.archiveCollection.bind(cachedDataService)
export const unarchiveCollection = cachedDataService.unarchiveCollection.bind(cachedDataService)
export const deleteCollection = cachedDataService.deleteCollection.bind(cachedDataService)
export const addDot = cachedDataService.addDot.bind(cachedDataService)
export const updateDot = cachedDataService.updateDot.bind(cachedDataService)
export const deleteDot = cachedDataService.deleteDot.bind(cachedDataService)
export const createSnapshot = cachedDataService.createSnapshot.bind(cachedDataService)
export const fetchSnapshots = cachedDataService.fetchSnapshots.bind(cachedDataService)
export const loadSnapshot = cachedDataService.loadSnapshot.bind(cachedDataService)
export const deleteSnapshot = cachedDataService.deleteSnapshot.bind(cachedDataService)
export const fetchUserPreferences = cachedDataService.fetchUserPreferences.bind(cachedDataService)
export const importData = cachedDataService.importData.bind(cachedDataService)
export const resetAllCollections = cachedDataService.resetAllCollections.bind(cachedDataService)

// Additional cache utilities
export const refreshCache = (userId: string) => getCachedDataService().refreshCache(userId)
export const clearUserCache = (userId: string) => getCachedDataService().clearUserCache(userId)
export const validateCacheFreshness = (userId: string) => getCachedDataService().validateCacheFreshness(userId)