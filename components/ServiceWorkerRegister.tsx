"use client";

import { useEffect } from 'react';

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker with immediate update check
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered successfully:', registration);
          
          // Check for updates immediately and periodically
          registration.update();
          
          // Check for updates every 30 seconds in production
          if (process.env.NODE_ENV === 'production') {
            setInterval(() => {
              registration.update();
            }, 30000);
          }
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New service worker is available
                    console.log('[SW] New service worker available, reloading...');
                    // Skip waiting and reload immediately in production
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    // Wait a moment for the new SW to activate, then reload
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  } else {
                    // First time installation
                    console.log('[SW] Service Worker installed for the first time');
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_CLEARED') {
          console.log('[SW] Received cache cleared notification');
        }
      });
      
      // Handle controller change (new SW taking over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, new Service Worker active');
      });
    }
  }, []);

  return null; // This component doesn't render anything
};

export default ServiceWorkerRegister;