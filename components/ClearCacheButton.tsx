"use client";

import React from 'react';
import { Button } from './ui/button';
import { sessionValidationService } from '@/lib/services/sessionValidationService';

interface ClearCacheButtonProps {
  onClear?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const ClearCacheButton: React.FC<ClearCacheButtonProps> = ({ 
  onClear, 
  variant = 'outline', 
  size = 'sm',
  className 
}) => {
  const handleClearCache = async () => {
    try {
      console.log('[CLEAR_CACHE] Manually clearing all cached data');
      
      // Clear session validation service data
      sessionValidationService.clearAllAuthData();
      
      // Clear service worker caches if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(async (cacheName) => {
              console.log('[CLEAR_CACHE] Deleting cache:', cacheName);
              return await caches.delete(cacheName);
            })
          );
          console.log('[CLEAR_CACHE] All service worker caches cleared');
        } catch (error) {
          console.error('[CLEAR_CACHE] Error clearing service worker caches:', error);
        }
      }
      
      // Clear any other localStorage items that might be causing issues
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('sb-') || 
          key.includes('supabase') || 
          key.includes('auth') ||
          key.includes('session')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage as well
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('sb-') || 
          key.includes('supabase') || 
          key.includes('auth') ||
          key.includes('session')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      console.log('[CLEAR_CACHE] Cache cleared successfully');
      
      // Call optional callback
      if (onClear) {
        onClear();
      }
      
      // Reload the page to start fresh
      window.location.reload();
      
    } catch (error) {
      console.error('[CLEAR_CACHE] Error clearing cache:', error);
      alert('Error clearing cache. Please try refreshing the page manually.');
    }
  };

  return (
    <Button 
      onClick={handleClearCache}
      variant={variant}
      size={size}
      className={className}
      title="Clear all cached data and reload the app"
    >
      Clear Cache & Reload
    </Button>
  );
};

export default ClearCacheButton;