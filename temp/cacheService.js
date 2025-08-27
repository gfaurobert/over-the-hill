"use strict";
/**
 * Cache Service - Core caching infrastructure for Over The Hill
 *
 * Provides intelligent caching with TTL, invalidation patterns, and storage management
 * to solve data synchronization issues between local cache and remote database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeCacheManager = exports.getCacheManager = exports.CacheManager = void 0;
const cacheInvalidationRules_1 = require("./cacheInvalidationRules");
const zlib = require("zlib");
// IndexedDB storage backend for larger data
class IndexedDBStorage {
    constructor() {
        this.dbName = 'OverTheHillCache';
        this.version = 1;
        this.storeName = 'cache';
    }
    async getDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };
        });
    }
    async getItem(key) {
        try {
            const db = await this.getDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                let completed = false;

                const cleanup = () => {
                    if (!completed) {
                        completed = true;
                    }
                };

                const request = store.get(key);

                request.onerror = () => {
                    cleanup();
                    // Abort transaction on request error
                    try {
                        transaction.abort();
                    } catch (abortError) {
                        // Transaction may already be aborted
                    }
                    reject(request.error);
                };

                request.onsuccess = () => {
                    cleanup();
                    const result = request.result;
                    resolve(result ? result.value : null);
                };

                // Handle transaction-level events
                transaction.oncomplete = () => {
                    if (!completed) {
                        cleanup();
                    }
                };

                transaction.onabort = () => {
                    cleanup();
                    if (!completed) {
                        reject(new Error('Transaction was aborted'));
                    }
                };

                transaction.onerror = () => {
                    cleanup();
                    if (!completed) {
                        reject(transaction.error || new Error('Transaction error'));
                    }
                };
            });
        }
        catch (error) {
            console.warn('[CACHE] IndexedDB getItem failed, falling back to localStorage:', error);
            // Return Promise to maintain async contract
            try {
                return Promise.resolve(localStorage.getItem(key));
            } catch (lsError) {
                return Promise.reject(new Error(`Both IndexedDB and localStorage failed: ${error.message}, ${lsError.message}`));
            }
        }
    }
    async setItem(key, value) {
        try {
            const db = await this.getDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            return new Promise((resolve, reject) => {
                const request = store.put({ key, value });
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        }
        catch (error) {
            console.warn('[CACHE] IndexedDB setItem failed, falling back to localStorage:', error);
            localStorage.setItem(key, value);
        }
    }
    async removeItem(key) {
        try {
            const db = await this.getDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        }
        catch (error) {
            console.warn('[CACHE] IndexedDB removeItem failed, falling back to localStorage:', error);
            localStorage.removeItem(key);
        }
    }
    async clear() {
        try {
            const db = await this.getDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        }
        catch (error) {
            console.warn('[CACHE] IndexedDB clear failed, falling back to localStorage:', error);
            // Clear all cache-related localStorage keys
            const keys = Object.keys(localStorage).filter(key => key.startsWith('oth_cache_'));
            keys.forEach(key => localStorage.removeItem(key));
        }
    }
    async keys() {
        try {
            const db = await this.getDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            return new Promise((resolve, reject) => {
                const request = store.getAllKeys();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }
        catch (error) {
            console.warn('[CACHE] IndexedDB keys failed, falling back to localStorage:', error);
            return Object.keys(localStorage).filter(key => key.startsWith('oth_cache_'));
        }
    }
}
// Main cache manager class
class CacheManager {
    constructor(config = {}) {
        this.cleanupTimer = null;
        this.metadata = null;
        this.config = {
            defaultTTL: 5 * 60 * 1000, // 5 minutes
            maxCacheSize: 50 * 1024 * 1024, // 50MB
            cleanupInterval: 60 * 60 * 1000, // 1 hour
            compressionEnabled: true,
            storagePrefix: 'oth_cache_',
            ...config
        };
        // Use IndexedDB for better storage capacity
        this.storage = new IndexedDBStorage();
        this.initializeCleanup();
        this.loadMetadata();
    }
    // Initialize periodic cleanup
    initializeCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.config.cleanupInterval);
    }
    // Load cache metadata
    async loadMetadata() {
        try {
            const metadataStr = await this.storage.getItem(`${this.config.storagePrefix}metadata`);
            if (metadataStr) {
                this.metadata = JSON.parse(metadataStr);
            }
            else {
                this.metadata = {
                    version: '1.0.0',
                    lastSync: Date.now(),
                    userId: '',
                    sessionId: '',
                    invalidationRules: []
                };
                await this.saveMetadata();
            }
        }
        catch (error) {
            console.error('[CACHE] Failed to load metadata:', error);
            this.metadata = {
                version: '1.0.0',
                lastSync: Date.now(),
                userId: '',
                sessionId: '',
                invalidationRules: []
            };
        }
    }
    // Save cache metadata
    async saveMetadata() {
        if (this.metadata) {
            try {
                await this.storage.setItem(`${this.config.storagePrefix}metadata`, JSON.stringify(this.metadata));
            }
            catch (error) {
                console.error('[CACHE] Failed to save metadata:', error);
            }
        }
    }
    // Generate cache key with prefix
    getCacheKey(key) {
        return `${this.config.storagePrefix}${key}`;
    }
    // Compress data using zlib compression
    compressData(data) {
        if (!this.config.compressionEnabled) {
            return data;
        }

        try {
            // Convert string to Buffer for compression
            const inputBuffer = Buffer.from(data, 'utf8');

            // Use gzip compression for good compression ratio and compatibility
            const compressedBuffer = zlib.gzipSync(inputBuffer);

            // Convert compressed buffer to base64 string for storage
            // Prefix with 'gzip:' to indicate compression format
            return 'gzip:' + compressedBuffer.toString('base64');
        }
        catch (error) {
            console.warn('[CACHE] Compression failed, storing uncompressed:', error.message);
            // Fall back to original data on compression failure
            return data;
        }
    }

    // Decompress data using zlib decompression
    decompressData(data) {
        // Check if data is compressed (has gzip prefix)
        if (!data.startsWith('gzip:')) {
            // Not compressed or legacy format, return as-is
            return data;
        }

        try {
            // Remove the 'gzip:' prefix and decode from base64
            const base64Data = data.substring(5);
            const compressedBuffer = Buffer.from(base64Data, 'base64');

            // Decompress using gzip
            const decompressedBuffer = zlib.gunzipSync(compressedBuffer);

            // Convert back to string
            return decompressedBuffer.toString('utf8');
        }
        catch (error) {
            console.warn('[CACHE] Decompression failed, returning original data:', error.message);
            // Fall back to original data on decompression failure
            // Remove prefix if it exists to avoid corruption
            return data.startsWith('gzip:') ? data.substring(5) : data;
        }
    }
    // Get item from cache
    async get(key) {
        try {
            const cacheKey = this.getCacheKey(key);
            const entryStr = await this.storage.getItem(cacheKey);
            if (!entryStr) {
                return null;
            }
            const decompressed = this.decompressData(entryStr);
            const entry = JSON.parse(decompressed);
            // Check if entry is expired
            if (this.isExpired(entry)) {
                await this.storage.removeItem(cacheKey);
                return null;
            }
            console.log(`[CACHE] Cache hit for key: ${key}`);
            return entry.data;
        }
        catch (error) {
            console.error(`[CACHE] Failed to get cache entry for key ${key}:`, error);
            return null;
        }
    }
    // Set item in cache
    async set(key, data, ttl) {
        try {
            const entry = {
                key,
                data,
                timestamp: Date.now(),
                ttl: ttl || this.config.defaultTTL,
                version: this.metadata?.version || '1.0.0',
                userId: this.metadata?.userId || '',
                entityType: this.extractEntityType(key),
                entityId: this.extractEntityId(key)
            };
            const entryStr = JSON.stringify(entry);
            const compressed = this.compressData(entryStr);
            const cacheKey = this.getCacheKey(key);
            await this.storage.setItem(cacheKey, compressed);
            console.log(`[CACHE] Cache set for key: ${key}, TTL: ${entry.ttl}ms`);
        }
        catch (error) {
            console.error(`[CACHE] Failed to set cache entry for key ${key}:`, error);
        }
    }
    // Check if cache entry is expired
    isExpired(entry) {
        return Date.now() > (entry.timestamp + entry.ttl);
    }
    // Extract entity type from cache key
    extractEntityType(key) {
        if (key.includes('collections'))
            return 'collection';
        if (key.includes('dots'))
            return 'dot';
        if (key.includes('snapshots'))
            return 'snapshot';
        if (key.includes('preferences'))
            return 'user_preferences';
        return 'collection'; // default
    }
    // Extract entity ID from cache key
    extractEntityId(key) {
        const parts = key.split(':');
        // Look for UUID-like patterns
        for (const part of parts) {
            if (part.length > 10 && (part.includes('-') || /^\d+$/.test(part))) {
                return part;
            }
        }
        return undefined;
    }
    // Invalidate specific cache key
    async invalidate(key) {
        try {
            const keys = Array.isArray(key) ? key : [key];
            for (const k of keys) {
                const cacheKey = this.getCacheKey(k);
                await this.storage.removeItem(cacheKey);
                console.log(`[CACHE] Invalidated cache key: ${k}`);
            }
        }
        catch (error) {
            console.error('[CACHE] Failed to invalidate cache keys:', error);
        }
    }
    // Invalidate cache keys matching a pattern
    async invalidatePattern(pattern) {
        try {
            console.log(`[CACHE] Invalidating pattern: ${pattern}`);
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix));
            // Convert pattern to regex
            const regex = this.patternToRegex(pattern);
            const matchingKeys = [];
            for (const cacheKey of cacheKeys) {
                if (cacheKey.endsWith('metadata'))
                    continue; // Skip metadata
                // Remove prefix to get original key
                const originalKey = cacheKey.replace(this.config.storagePrefix, '');
                if (regex.test(originalKey)) {
                    matchingKeys.push(cacheKey);
                }
            }
            // Remove matching keys
            for (const cacheKey of matchingKeys) {
                await this.storage.removeItem(cacheKey);
            }
            console.log(`[CACHE] Invalidated ${matchingKeys.length} keys matching pattern: ${pattern}`);
        }
        catch (error) {
            console.error(`[CACHE] Failed to invalidate pattern ${pattern}:`, error);
        }
    }
    // Convert glob-like pattern to regex
    patternToRegex(pattern) {
        // Escape special regex characters except * and ?
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${regexPattern}$`);
    }
    // Invalidate with cascade rules
    async invalidateWithCascade(key, entityType, entityId) {
        try {
            console.log(`[CACHE] Invalidating with cascade: ${key}, type: ${entityType}, id: ${entityId}`);
            // First invalidate the specific key
            await this.invalidate(key);
            // Apply cascade rules based on entity type
            const cascadePatterns = this.getCascadePatterns(entityType, entityId);
            for (const pattern of cascadePatterns) {
                await this.invalidatePattern(pattern);
            }
            console.log(`[CACHE] Cascade invalidation complete for ${key}`);
        }
        catch (error) {
            console.error(`[CACHE] Failed to invalidate with cascade ${key}:`, error);
        }
    }
    // Get cascade patterns for entity type
    getCascadePatterns(entityType, entityId) {
        const patterns = [];
        switch (entityType) {
            case 'collection':
                if (entityId) {
                    // When a collection changes, invalidate its dots and related snapshots
                    patterns.push(`*:dots:${entityId}*`);
                    patterns.push(`*:snapshots:${entityId}*`);
                    patterns.push(`*:collection:${entityId}*`);
                }
                // Also invalidate collection lists
                patterns.push('*:collections*');
                break;
            case 'dot':
                if (entityId) {
                    // When a dot changes, invalidate the parent collection
                    patterns.push(`*:collection:*${entityId}*`);
                    patterns.push(`*:collections*`);
                }
                break;
            case 'snapshot':
                // Snapshots don't typically cascade to other entities
                break;
            case 'user_preferences':
                // User preferences might affect UI state caching
                patterns.push('*:ui:*');
                break;
        }
        return patterns;
    }
    // Invalidate all cache for a specific user
    async invalidateUser(userId) {
        try {
            console.log(`[CACHE] Invalidating all cache for user: ${userId}`);
            await this.invalidatePattern(`${userId}:*`);
            console.log(`[CACHE] User cache invalidation complete for: ${userId}`);
        }
        catch (error) {
            console.error(`[CACHE] Failed to invalidate user cache for ${userId}:`, error);
        }
    }
    // Invalidate all cache for a specific session
    async invalidateSession(sessionId) {
        try {
            console.log(`[CACHE] Invalidating all cache for session: ${sessionId}`);
            // Get all cache keys and check their metadata
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix) && !key.endsWith('metadata'));
            const keysToInvalidate = [];
            for (const cacheKey of cacheKeys) {
                try {
                    const entryStr = await this.storage.getItem(cacheKey);
                    if (entryStr) {
                        const entry = JSON.parse(this.decompressData(entryStr));
                        // Note: We don't store sessionId in cache entries currently,
                        // but this structure allows for future enhancement
                        keysToInvalidate.push(cacheKey);
                    }
                }
                catch (error) {
                    // Remove corrupted entries
                    keysToInvalidate.push(cacheKey);
                }
            }
            // Remove all keys (for now, since we don't track sessionId in entries)
            for (const cacheKey of keysToInvalidate) {
                await this.storage.removeItem(cacheKey);
            }
            console.log(`[CACHE] Session cache invalidation complete for: ${sessionId}`);
        }
        catch (error) {
            console.error(`[CACHE] Failed to invalidate session cache for ${sessionId}:`, error);
        }
    }
    // Refresh stale data by invalidating expired entries
    async refreshStaleData() {
        try {
            console.log('[CACHE] Refreshing stale data');
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix) && !key.endsWith('metadata'));
            let refreshedCount = 0;
            for (const cacheKey of cacheKeys) {
                try {
                    const entryStr = await this.storage.getItem(cacheKey);
                    if (entryStr) {
                        const entry = JSON.parse(this.decompressData(entryStr));
                        if (this.isExpired(entry)) {
                            await this.storage.removeItem(cacheKey);
                            refreshedCount++;
                        }
                    }
                }
                catch (error) {
                    // Remove corrupted entries
                    await this.storage.removeItem(cacheKey);
                    refreshedCount++;
                }
            }
            console.log(`[CACHE] Refreshed ${refreshedCount} stale entries`);
        }
        catch (error) {
            console.error('[CACHE] Failed to refresh stale data:', error);
        }
    }
    // Clear all cache
    async clear() {
        try {
            await this.storage.clear();
            console.log('[CACHE] All cache cleared');
        }
        catch (error) {
            console.error('[CACHE] Failed to clear cache:', error);
        }
    }
    // Check if cache key is stale
    async isStale(key) {
        try {
            const cacheKey = this.getCacheKey(key);
            const entryStr = await this.storage.getItem(cacheKey);
            if (!entryStr) {
                return true; // No cache entry means stale
            }
            const entry = JSON.parse(this.decompressData(entryStr));
            return this.isExpired(entry);
        }
        catch (error) {
            console.error(`[CACHE] Failed to check staleness for key ${key}:`, error);
            return true; // Assume stale on error
        }
    }
    // Validate cache freshness
    async validateFreshness(key) {
        return !(await this.isStale(key));
    }
    // Clean up expired entries
    async cleanupExpiredEntries() {
        try {
            console.log('[CACHE] Starting cleanup of expired entries');
            const keys = await this.storage.keys();
            const cacheKeys = keys.filter(key => key.startsWith(this.config.storagePrefix));
            let cleanedCount = 0;
            for (const cacheKey of cacheKeys) {
                if (cacheKey.endsWith('metadata'))
                    continue; // Skip metadata
                try {
                    const entryStr = await this.storage.getItem(cacheKey);
                    if (entryStr) {
                        const entry = JSON.parse(this.decompressData(entryStr));
                        if (this.isExpired(entry)) {
                            await this.storage.removeItem(cacheKey);
                            cleanedCount++;
                        }
                    }
                }
                catch (error) {
                    // Remove corrupted entries
                    await this.storage.removeItem(cacheKey);
                    cleanedCount++;
                }
            }
            if (cleanedCount > 0) {
                console.log(`[CACHE] Cleaned up ${cleanedCount} expired/corrupted entries`);
            }
        }
        catch (error) {
            console.error('[CACHE] Failed to cleanup expired entries:', error);
        }
    }
    // Update metadata
    async updateMetadata(updates) {
        if (this.metadata) {
            this.metadata = { ...this.metadata, ...updates };
            await this.saveMetadata();
        }
    }
    // Invalidate cache based on operation and rules
    async invalidateByOperation(operation, userId, entityId, entityType) {
        try {
            console.log(`[CACHE] Invalidating by operation: ${operation}, user: ${userId}, entity: ${entityId}`);
            const ruleManager = (0, cacheInvalidationRules_1.getInvalidationRuleManager)();
            const patterns = ruleManager.getInvalidationPatterns(operation, entityId, userId);
            for (const pattern of patterns) {
                await this.invalidatePattern(pattern);
            }
            // If entity type is provided, also run cascade invalidation
            if (entityType && entityId) {
                const cacheKey = `user:${userId}:${entityType}:${entityId}`;
                await this.invalidateWithCascade(cacheKey, entityType, entityId);
            }
            console.log(`[CACHE] Operation-based invalidation complete: ${operation}`);
        }
        catch (error) {
            console.error(`[CACHE] Failed to invalidate by operation ${operation}:`, error);
        }
    }
    // Destroy cache manager
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}
exports.CacheManager = CacheManager;
// Singleton cache manager instance
let cacheManagerInstance = null;
const getCacheManager = () => {
    if (!cacheManagerInstance) {
        cacheManagerInstance = new CacheManager();
    }
    return cacheManagerInstance;
};
exports.getCacheManager = getCacheManager;
// Initialize cache manager with user context
const initializeCacheManager = (userId, sessionId) => {
    const cacheManager = (0, exports.getCacheManager)();
    cacheManager.updateMetadata({ userId, sessionId, lastSync: Date.now() });
    return cacheManager;
};
exports.initializeCacheManager = initializeCacheManager;
