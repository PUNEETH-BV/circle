// Service Worker for Circle Web Push Notifications

self.addEventListener('install', (event) => {
  // Activate service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listen to push events from server
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Circle Notification',
    body: 'You have a new update in Circle.',
    url: '/'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: 'Circle Notification',
        body: event.data.text(),
        url: '/'
      };
    }
  }

  const options = {
    body: payload.body,
    icon: '/logo.png', // We can fallback to standard paths
    badge: '/logo.png',
    data: {
      url: payload.url || '/'
    },
    // Prevent stacking multiple notifications of the same type
    tag: payload.tag || 'circle-notification',
    // Vibrate pattern
    vibrate: [100, 50, 100],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Listen to notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url 
    ? new URL(event.notification.data.url, self.location.origin).href
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If a window is already open, focus it and navigate
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              return focusedClient.navigate(targetUrl);
            });
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
