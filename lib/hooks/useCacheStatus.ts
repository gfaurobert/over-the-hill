/**
 * Hook to track cache status and provide real-time cache information
 */

import { useState, useEffect } from 'react'
import { getCacheManager } from '@/lib/services/cacheService'

export interface CacheStatus {
  isActive: boolean
  isInitialized: boolean
  lastActivity: number | null
  cacheHits: number
  cacheMisses: number
  totalEntries: number
  status: 'initializing' | 'active' | 'inactive' | 'error' | 'ssr'
}

export const useCacheStatus = () => {
  const [status, setStatus] = useState<CacheStatus>({
    isActive: false,
    isInitialized: false,
    lastActivity: null,
    cacheHits: 0,
    cacheMisses: 0,
    totalEntries: 0,
    status: 'initializing'
  })

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      setStatus(prev => ({ ...prev, status: 'ssr' }))
      return
    }

    const updateStatus = async () => {
      try {
        const cacheManager = getCacheManager()
        
        // Check if cache is properly initialized
        const isInitialized = cacheManager !== null
        
        if (isInitialized) {
          // Get cache statistics (this would need to be added to the cache manager)
          const totalEntries = await getCacheEntryCount()
          
          setStatus({
            isActive: true,
            isInitialized: true,
            lastActivity: Date.now(),
            cacheHits: 0, // Would need to be tracked in cache manager
            cacheMisses: 0, // Would need to be tracked in cache manager
            totalEntries,
            status: 'active'
          })
        } else {
          setStatus(prev => ({ ...prev, status: 'inactive' }))
        }
      } catch (error) {
        console.error('[CACHE_STATUS] Error checking cache status:', error)
        setStatus(prev => ({ ...prev, status: 'error' }))
      }
    }

    updateStatus()
    
    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return status
}

// Helper function to get cache entry count
const getCacheEntryCount = async (): Promise<number> => {
  try {
    if (typeof window === 'undefined') return 0
    
    const cacheManager = getCacheManager()
    // This would need to be implemented in the cache manager
    // For now, return a placeholder
    return 0
  } catch {
    return 0
  }
}
