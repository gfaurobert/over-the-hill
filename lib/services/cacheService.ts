/**
 * Cache Service - Core caching infrastructure for Over The Hill
 * 
 * Provides intelligent caching with TTL, invalidation patterns, and storage management
 * to solve data synchronization issues between local cache and remote database.
 */

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

// Main cache manager class
export class CacheManager {
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