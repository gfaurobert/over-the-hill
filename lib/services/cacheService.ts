/**
 * Cache Service - Core caching infrastructure for Over The Hill
 * 
 * Provides intelligent caching with TTL, invalidation patterns, and storage management
 * to solve data synchronization issues between local cache and remote database.
 */

import { getInvalidationRuleManager } from './cacheInvalidationRules'
import * as LZString from 'lz-string'

// Custom error types for IndexedDB operations
export class CacheStorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'CacheStorageError'
  }
}

export class CacheQuotaExceededError extends CacheStorageError {
  constructor(message: string = 'Storage quota exceeded', cause?: Error) {
    super(message, cause)
    this.name = 'CacheQuotaExceededError'
  }
}

export class CacheBlockedError extends CacheStorageError {
  constructor(message: string = 'Database operation blocked', cause?: Error) {
    super(message, cause)
    this.name = 'CacheBlockedError'
  }
}

export class CacheUpgradeError extends CacheStorageError {
  constructor(message: string = 'Database upgrade failed', cause?: Error) {
    super(message, cause)
    this.name = 'CacheUpgradeError'
  }
}

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

      request.onerror = () => {
        const error = request.error
        if (error) {
          // Handle quota exceeded errors specifically
          if (error.name === 'QuotaExceededError' ||
            (error as any).code === 22 || // Legacy quota error code
            error.message?.toLowerCase().includes('quota')) {
            reject(new CacheQuotaExceededError(
              `IndexedDB quota exceeded: ${error.message}`,
              error
            ))
            return
          }

          // Handle other specific error types
          if (error.name === 'VersionError') {
            reject(new CacheUpgradeError(
              `IndexedDB version error: ${error.message}`,
              error
            ))
            return
          }

          // Generic storage error
          reject(new CacheStorageError(
            `IndexedDB open failed: ${error.message}`,
            error
          ))
        } else {
          reject(new CacheStorageError('IndexedDB open failed with unknown error'))
        }
      }

      request.onsuccess = () => resolve(request.result)

      request.onblocked = () => {
        reject(new CacheBlockedError(
          'IndexedDB open blocked - another connection may be preventing the operation'
        ))
      }

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result

          // Guard against errors during object store creation
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' })
          }
        } catch (error) {
          // Handle quota or other errors during upgrade
          if (error instanceof Error) {
            if (error.name === 'QuotaExceededError' ||
              (error as any).code === 22 ||
              error.message?.toLowerCase().includes('quota')) {
              reject(new CacheQuotaExceededError(
                `Quota exceeded during database upgrade: ${error.message}`,
                error
              ))
            } else {
              reject(new CacheUpgradeError(
                `Database upgrade failed: ${error.message}`,
                error
              ))
            }
          } else {
            reject(new CacheUpgradeError('Database upgrade failed with unknown error'))
          }
        }
      }
    })
  }

  async getItem(key: string): Promise<string | null> {
    let db: IDBDatabase | null = null

    try {
      db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        let completed = false

        const cleanup = () => {
          if (!completed) {
            completed = true
            // Close the database connection to prevent memory leaks
            if (db) {
              db.close()
            }
          }
        }

        const request = store.get(key)

        request.onerror = () => {
          cleanup()
          const error = request.error
          if (error) {
            reject(new CacheStorageError(
              `IndexedDB get failed: ${error.message}`,
              error
            ))
          } else {
            reject(new CacheStorageError('IndexedDB get failed with unknown error'))
          }
        }

        request.onsuccess = () => {
          cleanup()
          const result = request.result
          resolve(result ? result.value : null)
        }

        // Handle transaction events
        transaction.oncomplete = () => {
          if (!completed) {
            cleanup()
          }
        }

        transaction.onabort = () => {
          cleanup()
          if (!completed) {
            reject(new CacheStorageError('Transaction was aborted'))
          }
        }

        transaction.onerror = () => {
          cleanup()
          const error = transaction.error
          if (!completed) {
            reject(new CacheStorageError(
              `Transaction error: ${error?.message || 'Unknown transaction error'}`,
              error || undefined
            ))
          }
        }
      })
    } catch (error) {
      // Close db connection if getDB() succeeded but transaction setup failed
      if (db) {
        db.close()
      }

      if (error instanceof CacheBlockedError) {
        console.warn('[CACHE] IndexedDB blocked while getting item, falling back to localStorage:', error.message)
      } else {
        console.warn('[CACHE] IndexedDB getItem failed, falling back to localStorage:', error)
      }
      return localStorage.getItem(key)
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    let db: IDBDatabase | null = null

    try {
      db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        let completed = false

        const cleanup = () => {
          if (!completed) {
            completed = true
            // Close the database connection to prevent memory leaks
            if (db) {
              db.close()
            }
          }
        }

        const request = store.put({ key, value })

        request.onerror = () => {
          cleanup()
          const error = request.error
          if (error) {
            // Handle quota exceeded errors specifically
            if (error.name === 'QuotaExceededError' ||
              (error as any).code === 22 ||
              error.message?.toLowerCase().includes('quota')) {
              reject(new CacheQuotaExceededError(
                `Storage quota exceeded while saving: ${error.message}`,
                error
              ))
            } else {
              reject(new CacheStorageError(
                `IndexedDB put failed: ${error.message}`,
                error
              ))
            }
          } else {
            reject(new CacheStorageError('IndexedDB put failed with unknown error'))
          }
        }

        request.onsuccess = () => {
          cleanup()
          resolve()
        }

        // Handle transaction events
        transaction.oncomplete = () => {
          if (!completed) {
            cleanup()
          }
        }

        transaction.onabort = () => {
          cleanup()
          if (!completed) {
            reject(new CacheStorageError('Transaction was aborted'))
          }
        }

        transaction.onerror = () => {
          cleanup()
          const error = transaction.error
          if (!completed) {
            if (error && (error.name === 'QuotaExceededError' || (error as any).code === 22)) {
              reject(new CacheQuotaExceededError(
                `Transaction quota exceeded: ${error.message}`,
                error
              ))
            } else {
              reject(new CacheStorageError(
                `Transaction error: ${error?.message || 'Unknown transaction error'}`,
                error || undefined
              ))
            }
          }
        }
      })
    } catch (error) {
      // Close db connection if getDB() succeeded but transaction setup failed
      if (db) {
        db.close()
      }

      // Handle specific error types for better fallback decisions
      if (error instanceof CacheQuotaExceededError) {
        console.warn('[CACHE] IndexedDB quota exceeded, falling back to localStorage:', error.message)
        // Try localStorage but it might also fail due to quota
        try {
          localStorage.setItem(key, value)
        } catch (lsError) {
          throw new CacheQuotaExceededError('Both IndexedDB and localStorage quota exceeded')
        }
      } else if (error instanceof CacheBlockedError) {
        console.warn('[CACHE] IndexedDB blocked, falling back to localStorage:', error.message)
        localStorage.setItem(key, value)
      } else {
        console.warn('[CACHE] IndexedDB setItem failed, falling back to localStorage:', error)
        localStorage.setItem(key, value)
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    let db: IDBDatabase | null = null

    try {
      db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        let completed = false

        const cleanup = () => {
          if (!completed) {
            completed = true
            // Close the database connection to prevent memory leaks
            if (db) {
              db.close()
            }
          }
        }

        const request = store.delete(key)

        request.onerror = () => {
          cleanup()
          const error = request.error
          if (error) {
            reject(new CacheStorageError(
              `IndexedDB delete failed: ${error.message}`,
              error
            ))
          } else {
            reject(new CacheStorageError('IndexedDB delete failed with unknown error'))
          }
        }

        request.onsuccess = () => {
          cleanup()
          resolve()
        }

        // Handle transaction events
        transaction.oncomplete = () => {
          if (!completed) {
            cleanup()
          }
        }

        transaction.onabort = () => {
          cleanup()
          if (!completed) {
            reject(new CacheStorageError('Transaction was aborted'))
          }
        }

        transaction.onerror = () => {
          cleanup()
          const error = transaction.error
          if (!completed) {
            reject(new CacheStorageError(
              `Transaction error: ${error?.message || 'Unknown transaction error'}`,
              error || undefined
            ))
          }
        }
      })
    } catch (error) {
      // Close db connection if getDB() succeeded but transaction setup failed
      if (db) {
        db.close()
      }

      if (error instanceof CacheBlockedError) {
        console.warn('[CACHE] IndexedDB blocked while removing item, falling back to localStorage:', error.message)
      } else {
        console.warn('[CACHE] IndexedDB removeItem failed, falling back to localStorage:', error)
      }
      localStorage.removeItem(key)
    }
  }

  async clear(): Promise<void> {
    let db: IDBDatabase | null = null

    try {
      db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        let completed = false

        const cleanup = () => {
          if (!completed) {
            completed = true
            // Close the database connection to prevent memory leaks
            if (db) {
              db.close()
            }
          }
        }

        const request = store.clear()

        request.onerror = () => {
          cleanup()
          const error = request.error
          if (error) {
            reject(new CacheStorageError(
              `IndexedDB clear failed: ${error.message}`,
              error
            ))
          } else {
            reject(new CacheStorageError('IndexedDB clear failed with unknown error'))
          }
        }

        request.onsuccess = () => {
          cleanup()
          resolve()
        }

        // Handle transaction events
        transaction.oncomplete = () => {
          if (!completed) {
            cleanup()
          }
        }

        transaction.onabort = () => {
          cleanup()
          if (!completed) {
            reject(new CacheStorageError('Transaction was aborted'))
          }
        }

        transaction.onerror = () => {
          cleanup()
          const error = transaction.error
          if (!completed) {
            reject(new CacheStorageError(
              `Transaction error: ${error?.message || 'Unknown transaction error'}`,
              error || undefined
            ))
          }
        }
      })
    } catch (error) {
      // Close db connection if getDB() succeeded but transaction setup failed
      if (db) {
        db.close()
      }

      if (error instanceof CacheBlockedError) {
        console.warn('[CACHE] IndexedDB blocked while clearing, falling back to localStorage:', error.message)
      } else {
        console.warn('[CACHE] IndexedDB clear failed, falling back to localStorage:', error)
      }

      // Clear all cache-related localStorage keys
      const keys = Object.keys(localStorage).filter(key => key.startsWith('oth_cache_'))
      keys.forEach(key => localStorage.removeItem(key))
    }
  }

  async keys(): Promise<string[]> {
    let db: IDBDatabase | null = null

    try {
      db = await this.getDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      // Handle transaction-level errors
      transaction.onerror = () => {
        const error = transaction.error
        if (error && (error.name === 'QuotaExceededError' || (error as any).code === 22)) {
          throw new CacheQuotaExceededError(`Transaction quota exceeded: ${error.message}`, error)
        }
      }

      return new Promise((resolve, reject) => {
        let completed = false

        const cleanup = () => {
          if (db && !completed) {
            completed = true
            // Note: Don't call db.close() as it may interfere with other operations
            // IndexedDB connections are typically managed by the browser
          }
        }

        const request = store.getAllKeys()

        request.onerror = () => {
          cleanup()
          const error = request.error
          if (error) {
            if (error.name === 'QuotaExceededError' ||
              (error as any).code === 22 ||
              error.message?.toLowerCase().includes('quota')) {
              reject(new CacheQuotaExceededError(
                `Quota exceeded while getting keys: ${error.message}`,
                error
              ))
            } else {
              reject(new CacheStorageError(
                `IndexedDB getAllKeys failed: ${error.message}`,
                error
              ))
            }
          } else {
            reject(new CacheStorageError('IndexedDB getAllKeys failed with unknown error'))
          }
        }

        request.onsuccess = () => {
          cleanup()
          resolve(request.result as string[])
        }

        // Handle transaction completion/abort
        transaction.oncomplete = () => {
          // Transaction completed successfully
          if (!completed) {
            cleanup()
          }
        }

        transaction.onabort = () => {
          cleanup()
          if (!completed) {
            reject(new CacheStorageError('Transaction was aborted'))
          }
        }

        transaction.onerror = () => {
          cleanup()
          const error = transaction.error
          if (!completed) {
            if (error && (error.name === 'QuotaExceededError' || (error as any).code === 22)) {
              reject(new CacheQuotaExceededError(
                `Transaction error - quota exceeded: ${error.message}`,
                error
              ))
            } else {
              reject(new CacheStorageError(
                `Transaction error: ${error?.message || 'Unknown transaction error'}`,
                error || undefined
              ))
            }
          }
        }
      })
    } catch (error) {
      // Handle specific error types for better fallback decisions
      if (error instanceof CacheQuotaExceededError) {
        console.warn('[CACHE] IndexedDB quota exceeded while getting keys, falling back to localStorage:', error.message)
      } else if (error instanceof CacheBlockedError) {
        console.warn('[CACHE] IndexedDB blocked while getting keys, falling back to localStorage:', error.message)
      } else {
        console.warn('[CACHE] IndexedDB keys failed, falling back to localStorage:', error)
      }

      // Fallback to localStorage
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
  private cleanupTimer: number | null = null
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
    if (this.cleanupTimer !== null) {
      window.clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = window.setInterval(() => {
      this.cleanupExpiredEntries()
    }, this.config.cleanupInterval) as number
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

  // Compress data using LZ-String compression
  private compressData(data: string): string {
    if (!this.config.compressionEnabled) {
      return data
    }

    try {
      // Use LZ-String compression for efficient string compression
      const compressed = LZString.compressToUTF16(data)

      // Add prefix to identify compressed data
      if (compressed && compressed.length < data.length) {
        return 'lz:' + compressed
      } else {
        // If compression doesn't reduce size, return original
        return data
      }
    } catch (error) {
      console.warn('[CACHE] Compression failed, storing uncompressed:', error)
      return data
    }
  }

  // Decompress data using LZ-String decompression
  private decompressData(data: string): string {
    // Check if data is compressed (has lz: prefix)
    if (!data.startsWith('lz:')) {
      // Not compressed, return as-is
      return data
    }

    try {
      // Remove the 'lz:' prefix and decompress
      const compressedData = data.substring(3)
      const decompressed = LZString.decompressFromUTF16(compressedData)

      if (decompressed !== null) {
        return decompressed
      } else {
        console.warn('[CACHE] Decompression failed, returning original data')
        // Return original data without prefix if decompression fails
        return compressedData
      }
    } catch (error) {
      console.warn('[CACHE] Decompression error, returning original data:', error)
      // Return data without prefix on error
      return data.substring(3)
    }
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
      if (error instanceof CacheQuotaExceededError) {
        console.warn(`[CACHE] Storage quota exceeded for key ${key}. Consider clearing old cache entries.`, error)
        // Optionally trigger cleanup of expired entries
        this.cleanupExpiredEntries().catch(() => {
          // Ignore cleanup errors in this context
        })
      } else if (error instanceof CacheBlockedError) {
        console.warn(`[CACHE] Storage blocked for key ${key}. Retrying later may succeed.`, error)
      } else {
        console.error(`[CACHE] Failed to set cache entry for key ${key}:`, error)
      }
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

      // Get all cache keys
      const keys = await this.storage.keys()
      const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix) && !key.endsWith('metadata'))

      // Since sessionId is not currently stored in cache entries, invalidate all keys
      // TODO: If sessionId is later stored in cache entries, reintroduce parsing logic:
      // - Add try/catch around getItem/JSON.parse/decompressData
      // - Check entry.sessionId === sessionId before adding to keysToInvalidate
      // - Handle corrupted entries by adding them to keysToInvalidate for cleanup
      const keysToInvalidate: string[] = []

      for (const cacheKey of cacheKeys) {
        keysToInvalidate.push(cacheKey)
      }

      // Remove all keys
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
    if (this.cleanupTimer !== null) {
      window.clearInterval(this.cleanupTimer)
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