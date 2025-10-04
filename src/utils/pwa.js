/**
 * PWA Utilities
 * Service worker registration and install prompt handling
 */

let deferredPrompt = null;

/**
 * Register Service Worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service Worker update found!');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New content available; please refresh.');
            // You can show a notification to the user here
          }
        });
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.log('Service Workers not supported');
    return null;
  }
}

/**
 * Unregister Service Worker (for development/debugging)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service Workers unregistered');
  }
}

/**
 * Setup PWA Install Prompt
 */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Save the event for later use
    deferredPrompt = e;
    console.log('Install prompt ready');
    
    // Trigger custom event for app to handle
    window.dispatchEvent(new Event('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
    window.dispatchEvent(new Event('pwa-installed'));
  });
}

/**
 * Show Install Prompt
 */
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User ${outcome} the install prompt`);
  
  deferredPrompt = null;
  return outcome === 'accepted';
}

/**
 * Check if app is installed
 */
export function isAppInstalled() {
  // Check if running in standalone mode
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Check if install is available
 */
export function isInstallAvailable() {
  return deferredPrompt !== null;
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage persisted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
}

/**
 * Check storage quota
 */
export async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage / estimate.quota) * 100;
    console.log(`Storage: ${estimate.usage} / ${estimate.quota} bytes (${percentUsed.toFixed(2)}%)`);
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed
    };
  }
  return null;
}

/**
 * Check if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Setup online/offline listeners
 */
export function setupOnlineOfflineListeners(onOnline, onOffline) {
  window.addEventListener('online', () => {
    console.log('App is online');
    if (onOnline) onOnline();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
    if (onOffline) onOffline();
  });
}

/**
 * Initialize PWA features
 */
export function initPWA() {
  // Register service worker
  registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Request persistent storage
  requestPersistentStorage();
  
  // Log initial online status
  console.log(`Initial online status: ${isOnline()}`);
  
  // Log if app is already installed
  if (isAppInstalled()) {
    console.log('App is running as installed PWA');
  }
}
