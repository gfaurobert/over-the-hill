/**
 * Cache Status Badge Component
 * Shows different cache status messages based on current state
 */

import React from 'react'
import { useCacheStatus } from '@/lib/hooks/useCacheStatus'

interface CacheStatusBadgeProps {
  className?: string
}

export const CacheStatusBadge: React.FC<CacheStatusBadgeProps> = ({ className = '' }) => {
  const cacheStatus = useCacheStatus()

  const getStatusConfig = () => {
    switch (cacheStatus.status) {
      case 'active':
        return {
          text: 'Cache Active',
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-800 dark:text-green-200',
          title: `Cache is working. ${cacheStatus.totalEntries} entries cached.`
        }
      
      case 'initializing':
        return {
          text: 'Cache Loading...',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          title: 'Cache is initializing...'
        }
      
      case 'inactive':
        return {
          text: 'Cache Offline',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400',
          title: 'Cache is not available. Data will be fetched from database.'
        }
      
      case 'error':
        return {
          text: 'Cache Error',
          bgColor: 'bg-red-100 dark:bg-red-900',
          textColor: 'text-red-800 dark:text-red-200',
          title: 'Cache encountered an error. Falling back to database.'
        }
      
      case 'ssr':
        return {
          text: 'Server Mode',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          textColor: 'text-blue-800 dark:text-blue-200',
          title: 'Running on server. Cache will activate in browser.'
        }
      
      default:
        return {
          text: 'Cache Unknown',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400',
          title: 'Cache status unknown.'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div 
      className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.textColor} ${className}`}
      title={config.title}
    >
      {config.text}
    </div>
  )
}
