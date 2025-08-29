/**
 * Storage Utilities - Comprehensive storage management
 * 
 * Handles clearing all types of browser storage to prevent conflicts
 * between different storage mechanisms.
 */

/**
 * Clear all application-related storage
 * This includes our cache, Supabase auth tokens, and any other app data
 */
export const clearAllAppStorage = async (): Promise<void> => {
  try {
    console.log('[STORAGE_UTILS] Clearing all application storage...')
    
    // 1. Clear our custom cache (IndexedDB + localStorage fallback)
    try {
      const { getCacheManager } = await import('@/lib/services/cacheService')
      const cacheManager = getCacheManager()
      await cacheManager.clear()
      console.log('[STORAGE_UTILS] Custom cache cleared')
    } catch (error) {
      console.warn('[STORAGE_UTILS] Failed to clear custom cache:', error)
    }
    
    // 2. Clear localStorage items related to our app
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = []
      
      // Find all keys that belong to our app
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('oth_cache_') || // Our cache keys
          key.includes('supabase') ||     // Supabase auth tokens
          key.includes('sb-') ||          // Supabase session keys
          key.includes('over-the-hill') || // App-specific keys
          key.includes('hill-chart')      // App-specific keys
        )) {
          keysToRemove.push(key)
        }
      }
      
      // Remove all identified keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
      
      console.log(`[STORAGE_UTILS] Removed ${keysToRemove.length} localStorage keys`)
    }
    
    // 3. Clear sessionStorage
    if (typeof window !== 'undefined') {
      const sessionKeysToRemove: string[] = []
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (
          key.startsWith('oth_cache_') ||
          key.includes('supabase') ||
          key.includes('sb-') ||
          key.includes('over-the-hill') ||
          key.includes('hill-chart')
        )) {
          sessionKeysToRemove.push(key)
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key)
      })
      
      console.log(`[STORAGE_UTILS] Removed ${sessionKeysToRemove.length} sessionStorage keys`)
    }
    
    // 4. Clear IndexedDB databases related to our app
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        // List all databases and delete app-related ones
        const databases = await indexedDB.databases?.() || []
        const appDatabases = databases.filter(db => 
          db.name && (
            db.name.includes('OverTheHill') ||
            db.name.includes('supabase') ||
            db.name.includes('oth_cache')
          )
        )
        
        for (const db of appDatabases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
            console.log(`[STORAGE_UTILS] Deleted IndexedDB: ${db.name}`)
          }
        }
      } catch (error) {
        console.warn('[STORAGE_UTILS] Failed to clear IndexedDB:', error)
      }
    }
    
    console.log('[STORAGE_UTILS] All application storage cleared successfully')
  } catch (error) {
    console.error('[STORAGE_UTILS] Error clearing storage:', error)
    throw error
  }
}

/**
 * Clear only user-specific cache (less aggressive)
 */
export const clearUserCache = async (userId: string): Promise<void> => {
  try {
    console.log(`[STORAGE_UTILS] Clearing cache for user: ${userId}`)
    
    // Clear our custom cache
    const { getCacheManager } = await import('@/lib/services/cacheService')
    const cacheManager = getCacheManager()
    await cacheManager.invalidateUser(userId)
    
    // Clear localStorage items for this user
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(`user:${userId}:`)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
      
      console.log(`[STORAGE_UTILS] Removed ${keysToRemove.length} user-specific localStorage keys`)
    }
    
    console.log(`[STORAGE_UTILS] User cache cleared for: ${userId}`)
  } catch (error) {
    console.error('[STORAGE_UTILS] Error clearing user cache:', error)
    throw error
  }
}
