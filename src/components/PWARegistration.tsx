'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && (window as any).workbox === undefined) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope: ', registration.scope);
          })
          .catch((err) => {
            console.error('Service Worker registration failed: ', err);
          });
      });
    }
  }, []);

  return null;
}
