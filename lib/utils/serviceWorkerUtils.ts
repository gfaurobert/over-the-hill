/**
 * Service Worker Utilities
 * 
 * Handles service worker registration and updates to ensure
 * cache-busting changes take effect immediately.
 */

export const registerServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    console.log('[SW_UTILS] Registering service worker...')
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('[SW_UTILS] Service worker registered:', registration)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      console.log('[SW_UTILS] New service worker found, updating...')
      const newWorker = registration.installing
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW_UTILS] New service worker installed, reloading page...')
            // Force reload to use new service worker
            window.location.reload()
          }
        })
      }
    })

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_CLEARED') {
        console.log('[SW_UTILS] Service worker cache cleared')
      }
    })

  } catch (error) {
    console.error('[SW_UTILS] Service worker registration failed:', error)
  }
}

export const clearServiceWorkerCache = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    console.log('[SW_UTILS] Clearing service worker cache...')
    
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      })
    }

    // Also clear all caches directly
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW_UTILS] Deleting cache:', cacheName)
          return caches.delete(cacheName)
        })
      )
    }

    console.log('[SW_UTILS] Service worker cache cleared successfully')
  } catch (error) {
    console.error('[SW_UTILS] Failed to clear service worker cache:', error)
  }
}

export const unregisterServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    console.log('[SW_UTILS] Unregistering service worker...')
    
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map(registration => registration.unregister())
    )

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }

    console.log('[SW_UTILS] Service worker unregistered successfully')
  } catch (error) {
    console.error('[SW_UTILS] Failed to unregister service worker:', error)
  }
}
