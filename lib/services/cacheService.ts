/**
 * Cache Service - Core caching infrastructure for Over The Hill
 * 
 * Provides intelligent caching with TTL, invalidation patterns, and storage management
 * to solve data synchronization issues between local cache and remote database.
 */

import { getInvalidationRuleManager } from './cacheInvalidationRules'

// Cache entry interface with metadata
export interface CacheEntry<T> {
  key: string
  data: T
  timestamp: number
  ttl: number
  version: string
  userId: string
  entityType: 'collection' | 'dot' | 'snapshot' | 'user_preferences'
  entityId?: string
}

// Cache metadata for tracking and validation
export interface CacheMetadata {
  version: string
  lastSync: number
  userId: string
  sessionId: string
  invalidationRules: InvalidationRule[]
}

// Invalidation rule for pattern-based cache clearing
export interface InvalidationRule {
  trigger: 'mutation' | 'time' | 'session' | 'manual'
  pattern: string
  entityTypes: string[]
  cascadeRules?: string[]
}

// Cache configuration options
export interface CacheConfig {
  defaultTTL: number // Default: 5 minutes (300000ms)
  maxCacheSize: number // Default: 50MB
  cleanupInterval: number // Default: 1 hour (3600000ms)
  compressionEnabled: boolean // Default: true
  storagePrefix: string // Default: 'oth_cache_'
}

// Storage wrapper interface for different storage backends
interface StorageBackend {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}

// IndexedDB storage backend for larger data
class IndexedDBStorage implements StorageBackend {
  private dbName = 'OverTheHillCache'
  private version = 1
  private storeName = 'cache'

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }
    })
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.get(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const result = request.result
          resolve(result ? result.value : null)
        }
      })
    } catch (error) {
      console.warn('[CACHE] IndexedDB getItem failed, falling back to localStorage:', error)
      return localStorage.getItem(key)
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.put({ key, value })
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.warn('[CACHE] IndexedDB setItem failed, falling back to localStorage:', error)
      localStorage.setItem(key, value)
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.warn('[CACHE] IndexedDB removeItem failed, falling back to localStorage:', error)
      localStorage.removeItem(key)
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.warn('[CACHE] IndexedDB clear failed, falling back to localStorage:', error)
      // Clear all cache-related localStorage keys
      const keys = Object.keys(localStorage).filter(key => key.startsWith('oth_cache_'))
      keys.forEach(key => localStorage.removeItem(key))
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result as string[])
      })
    } catch (error) {
      console.warn('[CACHE] IndexedDB keys failed, falling back to localStorage:', error)
      return Object.keys(localStorage).filter(key => key.startsWith('oth_cache_'))
    }
  }
}

// Cache manager interface
export interface ICacheManager {
  // Cache operations
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, data: T, ttl?: number): Promise<void>
  invalidate(key: string | string[]): Promise<void>
  clear(): Promise<void>
  
  // Pattern-based invalidation
  invalidatePattern(pattern: string): Promise<void>
  invalidateWithCascade(key: string, entityType: CacheEntry<any>['entityType'], entityId?: string): Promise<void>
  invalidateUser(userId: string): Promise<void>
  invalidateSession(sessionId: string): Promise<void>
  
  // Freshness validation
  isStale(key: string): Promise<boolean>
  validateFreshness(key: string): Promise<boolean>
  refreshStaleData(): Promise<void>
  
  // Metadata management
  updateMetadata(updates: Partial<CacheMetadata>): Promise<void>
  
  // Rule-based invalidation
  invalidateByOperation(operation: string, userId: string, entityId?: string, entityType?: CacheEntry<any>['entityType']): Promise<void>
  
  // Lifecycle
  destroy(): void
}

// Main cache manager class
export class CacheManager implements ICacheManager {
  private config: CacheConfig
  private storage: StorageBackend
  private cleanupTimer: NodeJS.Timeout | null = null
  private metadata: CacheMetadata | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      compressionEnabled: true,
      storagePrefix: 'oth_cache_',
      ...config
    }

    // Use IndexedDB for better storage capacity
    this.storage = new IndexedDBStorage()
    
    this.initializeCleanup()
    this.loadMetadata()
  }

  // Initialize periodic cleanup
  private initializeCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries()
    }, this.config.cleanupInterval)
  }

  // Load cache metadata
  private async loadMetadata(): Promise<void> {
    try {
      const metadataStr = await this.storage.getItem(`${this.config.storagePrefix}metadata`)
      if (metadataStr) {
        this.metadata = JSON.parse(metadataStr)
      } else {
        this.metadata = {
          version: '1.0.0',
          lastSync: Date.now(),
          userId: '',
          sessionId: '',
          invalidationRules: []
        }
        await this.saveMetadata()
      }
    } catch (error) {
      console.error('[CACHE] Failed to load metadata:', error)
      this.metadata = {
        version: '1.0.0',
        lastSync: Date.now(),
        userId: '',
        sessionId: '',
        invalidationRules: []
      }
    }
  }

  // Save cache metadata
  private async saveMetadata(): Promise<void> {
    if (this.metadata) {
      try {
        await this.storage.setItem(
          `${this.config.storagePrefix}metadata`,
          JSON.stringify(this.metadata)
        )
      } catch (error) {
        console.error('[CACHE] Failed to save metadata:', error)
      }
    }
  }

  // Generate cache key with prefix
  private getCacheKey(key: string): string {
    return `${this.config.storagePrefix}${key}`
  }

  // Compress data if enabled
  private compressData(data: string): string {
    if (!this.config.compressionEnabled) return data
    
    // Simple compression using JSON.stringify optimization
    // In production, consider using a proper compression library
    try {
      return JSON.stringify(JSON.parse(data))
    } catch {
      return data
    }
  }

  // Decompress data if needed
  private decompressData(data: string): string {
    // For now, just return as-is since we're using simple JSON optimization
    return data
  }

  // Get item from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key)
      const entryStr = await this.storage.getItem(cacheKey)
      
      if (!entryStr) {
        return null
      }

      const decompressed = this.decompressData(entryStr)
      const entry: CacheEntry<T> = JSON.parse(decompressed)

      // Check if entry is expired
      if (this.isExpired(entry)) {
        await this.storage.removeItem(cacheKey)
        return null
      }

      console.log(`[CACHE] Cache hit for key: ${key}`)
      return entry.data
    } catch (error) {
      console.error(`[CACHE] Failed to get cache entry for key ${key}:`, error)
      return null
    }
  }

  // Set item in cache
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        version: this.metadata?.version || '1.0.0',
        userId: this.metadata?.userId || '',
        entityType: this.extractEntityType(key),
        entityId: this.extractEntityId(key)
      }

      const entryStr = JSON.stringify(entry)
      const compressed = this.compressData(entryStr)
      const cacheKey = this.getCacheKey(key)

      await this.storage.setItem(cacheKey, compressed)
      console.log(`[CACHE] Cache set for key: ${key}, TTL: ${entry.ttl}ms`)
    } catch (error) {
      console.error(`[CACHE] Failed to set cache entry for key ${key}:`, error)
    }
  }

  // Check if cache entry is expired
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() > (entry.timestamp + entry.ttl)
  }

  // Extract entity type from cache key
  private extractEntityType(key: string): CacheEntry<any>['entityType'] {
    if (key.includes('collections')) return 'collection'
    if (key.includes('dots')) return 'dot'
    if (key.includes('snapshots')) return 'snapshot'
    if (key.includes('preferences')) return 'user_preferences'
    return 'collection' // default
  }

  // Extract entity ID from cache key
  private extractEntityId(key: string): string | undefined {
    const parts = key.split(':')
    // Look for UUID-like patterns
    for (const part of parts) {
      if (part.length > 10 && (part.includes('-') || /^\d+$/.test(part))) {
        return part
      }
    }
    return undefined
  }

  // Invalidate specific cache key
  async invalidate(key: string | string[]): Promise<void> {
    try {
      const keys = Array.isArray(key) ? key : [key]
      
      for (const k of keys) {
        const cacheKey = this.getCacheKey(k)
        await this.storage.removeItem(cacheKey)
        console.log(`[CACHE] Invalidated cache key: ${k}`)
      }
    } catch (error) {
      console.error('[CACHE] Failed to invalidate cache keys:', error)
    }
  }

  // Invalidate cache keys matching a pattern
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      console.log(`[CACHE] Invalidating pattern: ${pattern}`)
      const keys = await this.storage.keys()
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix))
      
      // Convert pattern to regex
      const regex = this.patternToRegex(pattern)
      const matchingKeys: string[] = []
      
      for (const cacheKey of cacheKeys) {
        if (cacheKey.endsWith('metadata')) continue // Skip metadata
        
        // Remove prefix to get original key
        const originalKey = cacheKey.replace(this.config.storagePrefix, '')
        
        if (regex.test(originalKey)) {
          matchingKeys.push(cacheKey)
        }
      }
      
      // Remove matching keys
      for (const cacheKey of matchingKeys) {
        await this.storage.removeItem(cacheKey)
      }
      
      console.log(`[CACHE] Invalidated ${matchingKeys.length} keys matching pattern: ${pattern}`)
    } catch (error) {
      console.error(`[CACHE] Failed to invalidate pattern ${pattern}:`, error)
    }
  }

  // Convert glob-like pattern to regex
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    
    return new RegExp(`^${regexPattern}$`)
  }

  // Invalidate with cascade rules
  async invalidateWithCascade(key: string, entityType: CacheEntry<any>['entityType'], entityId?: string): Promise<void> {
    try {
      console.log(`[CACHE] Invalidating with cascade: ${key}, type: ${entityType}, id: ${entityId}`)
      
      // First invalidate the specific key
      await this.invalidate(key)
      
      // Apply cascade rules based on entity type
      const cascadePatterns = this.getCascadePatterns(entityType, entityId)
      
      for (const pattern of cascadePatterns) {
        await this.invalidatePattern(pattern)
      }
      
      console.log(`[CACHE] Cascade invalidation complete for ${key}`)
    } catch (error) {
      console.error(`[CACHE] Failed to invalidate with cascade ${key}:`, error)
    }
  }

  // Get cascade patterns for entity type
  private getCascadePatterns(entityType: CacheEntry<any>['entityType'], entityId?: string): string[] {
    const patterns: string[] = []
    
    switch (entityType) {
      case 'collection':
        if (entityId) {
          // When a collection changes, invalidate its dots and related snapshots
          patterns.push(`*:dots:${entityId}*`)
          patterns.push(`*:snapshots:${entityId}*`)
          patterns.push(`*:collection:${entityId}*`)
        }
        // Also invalidate collection lists
        patterns.push('*:collections*')
        break
        
      case 'dot':
        if (entityId) {
          // When a dot changes, invalidate the parent collection
          patterns.push(`*:collection:*${entityId}*`)
          patterns.push(`*:collections*`)
        }
        break
        
      case 'snapshot':
        // Snapshots don't typically cascade to other entities
        break
        
      case 'user_preferences':
        // User preferences might affect UI state caching
        patterns.push('*:ui:*')
        break
    }
    
    return patterns
  }

  // Invalidate all cache for a specific user
  async invalidateUser(userId: string): Promise<void> {
    try {
      console.log(`[CACHE] Invalidating all cache for user: ${userId}`)
      await this.invalidatePattern(`${userId}:*`)
      console.log(`[CACHE] User cache invalidation complete for: ${userId}`)
    } catch (error) {
      console.error(`[CACHE] Failed to invalidate user cache for ${userId}:`, error)
    }
  }

  // Invalidate all cache for a specific session
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      console.log(`[CACHE] Invalidating all cache for session: ${sessionId}`)
      
      // Get all cache keys and check their metadata
      const keys = await this.storage.keys()
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix) && !key.endsWith('metadata'))
      
      const keysToInvalidate: string[] = []
      
      for (const cacheKey of cacheKeys) {
        try {
          const entryStr = await this.storage.getItem(cacheKey)
          if (entryStr) {
            const entry: CacheEntry<any> = JSON.parse(this.decompressData(entryStr))
            // Note: We don't store sessionId in cache entries currently,
            // but this structure allows for future enhancement
            keysToInvalidate.push(cacheKey)
          }
        } catch (error) {
          // Remove corrupted entries
          keysToInvalidate.push(cacheKey)
        }
      }
      
      // Remove all keys (for now, since we don't track sessionId in entries)
      for (const cacheKey of keysToInvalidate) {
        await this.storage.removeItem(cacheKey)
      }
      
      console.log(`[CACHE] Session cache invalidation complete for: ${sessionId}`)
    } catch (error) {
      console.error(`[CACHE] Failed to invalidate session cache for ${sessionId}:`, error)
    }
  }

  // Refresh stale data by invalidating expired entries
  async refreshStaleData(): Promise<void> {
    try {
      console.log('[CACHE] Refreshing stale data')
      const keys = await this.storage.keys()
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix) && !key.endsWith('metadata'))
      
      let refreshedCount = 0
      
      for (const cacheKey of cacheKeys) {
        try {
          const entryStr = await this.storage.getItem(cacheKey)
          if (entryStr) {
            const entry: CacheEntry<any> = JSON.parse(this.decompressData(entryStr))
            if (this.isExpired(entry)) {
              await this.storage.removeItem(cacheKey)
              refreshedCount++
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await this.storage.removeItem(cacheKey)
          refreshedCount++
        }
      }
      
      console.log(`[CACHE] Refreshed ${refreshedCount} stale entries`)
    } catch (error) {
      console.error('[CACHE] Failed to refresh stale data:', error)
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      await this.storage.clear()
      console.log('[CACHE] All cache cleared')
    } catch (error) {
      console.error('[CACHE] Failed to clear cache:', error)
    }
  }

  // Check if cache key is stale
  async isStale(key: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(key)
      const entryStr = await this.storage.getItem(cacheKey)
      
      if (!entryStr) {
        return true // No cache entry means stale
      }

      const entry: CacheEntry<any> = JSON.parse(this.decompressData(entryStr))
      return this.isExpired(entry)
    } catch (error) {
      console.error(`[CACHE] Failed to check staleness for key ${key}:`, error)
      return true // Assume stale on error
    }
  }

  // Validate cache freshness
  async validateFreshness(key: string): Promise<boolean> {
    return !(await this.isStale(key))
  }

  // Clean up expired entries
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      console.log('[CACHE] Starting cleanup of expired entries')
      const keys = await this.storage.keys()
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix))
      
      let cleanedCount = 0
      
      for (const cacheKey of cacheKeys) {
        if (cacheKey.endsWith('metadata')) continue // Skip metadata
        
        try {
          const entryStr = await this.storage.getItem(cacheKey)
          if (entryStr) {
            const entry: CacheEntry<any> = JSON.parse(this.decompressData(entryStr))
            if (this.isExpired(entry)) {
              await this.storage.removeItem(cacheKey)
              cleanedCount++
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await this.storage.removeItem(cacheKey)
          cleanedCount++
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`[CACHE] Cleaned up ${cleanedCount} expired/corrupted entries`)
      }
    } catch (error) {
      console.error('[CACHE] Failed to cleanup expired entries:', error)
    }
  }

  // Update metadata
  async updateMetadata(updates: Partial<CacheMetadata>): Promise<void> {
    if (this.metadata) {
      this.metadata = { ...this.metadata, ...updates }
      await this.saveMetadata()
    }
  }

  // Invalidate cache based on operation and rules
  async invalidateByOperation(
    operation: string,
    userId: string,
    entityId?: string,
    entityType?: CacheEntry<any>['entityType']
  ): Promise<void> {
    try {
      console.log(`[CACHE] Invalidating by operation: ${operation}, user: ${userId}, entity: ${entityId}`)
      
      const ruleManager = getInvalidationRuleManager()
      const patterns = ruleManager.getInvalidationPatterns(operation, entityId, userId)
      
      for (const pattern of patterns) {
        await this.invalidatePattern(pattern)
      }
      
      // If entity type is provided, also run cascade invalidation
      if (entityType && entityId) {
        const cacheKey = `user:${userId}:${entityType}:${entityId}`
        await this.invalidateWithCascade(cacheKey, entityType, entityId)
      }
      
      console.log(`[CACHE] Operation-based invalidation complete: ${operation}`)
    } catch (error) {
      console.error(`[CACHE] Failed to invalidate by operation ${operation}:`, error)
    }
  }

  // Destroy cache manager
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// Singleton cache manager instance
let cacheManagerInstance: CacheManager | null = null

export const getCacheManager = (): CacheManager => {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager()
  }
  return cacheManagerInstance
}

// Initialize cache manager with user context
export const initializeCacheManager = (userId: string, sessionId: string): CacheManager => {
  const cacheManager = getCacheManager()
  cacheManager.updateMetadata({ userId, sessionId, lastSync: Date.now() })
  return cacheManager
}