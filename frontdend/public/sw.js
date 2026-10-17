/* SITTO service worker — receives Web Push notifications.
 *
 * Registered as /sw.js?api=<API base URL> (see src/services/pushService.js).
 * It does not cache pages: the app always loads fresh from the network.
 */

const API_BASE = new URL(self.location.href).searchParams.get('api') || '/api';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'SITTO', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'SITTO';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || data.type || 'sitto',
    renotify: true,
    requireInteraction: Boolean(data.urgent),
    vibrate: data.urgent ? [200, 100, 200, 100, 300] : [120],
    timestamp: Date.now(),
    data: { url: data.url || '/notifications', seatsure: data.seatsure || null },
  };
  if (data.seatsure) {
    options.actions = [
      { action: 'seatsure-yes', title: "✓ I'm here" },
      { action: 'seatsure-no', title: 'Release seat' },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

async function focusOrOpen(url) {
  const target = new URL(url, self.location.origin).href;
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
    if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
      await client.focus();
      if ('navigate' in client) return client.navigate(target);
      return client;
    }
  }
  return self.clients.openWindow(target);
}

async function respondToSeatSure(seatsure, response) {
  try {
    const res = await fetch(`${API_BASE}/seatsure/${encodeURIComponent(seatsure.taskId)}/push-respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: seatsure.token, response }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Could not send your response.');

    await self.registration.showNotification(
      response === 'YES' ? 'Presence confirmed ✓' : 'Seat released',
      {
        body: body.message || (response === 'YES' ? 'Enjoy the rest of your session.' : 'Thanks for freeing the seat.'),
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: 'seatsure-result',
        data: { url: '/reservations' },
      },
    );
  } catch (err) {
    // Fall back to the app, where the student can answer in-app
    await self.registration.showNotification('Open SITTO to respond', {
      body: err.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: 'seatsure-result',
      requireInteraction: true,
      data: { url: '/notifications' },
    });
  }
}

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const { url = '/notifications', seatsure } = notification.data || {};
  notification.close();

  if (seatsure && (event.action === 'seatsure-yes' || event.action === 'seatsure-no')) {
    event.waitUntil(respondToSeatSure(seatsure, event.action === 'seatsure-yes' ? 'YES' : 'NO'));
    return;
  }
  event.waitUntil(focusOrOpen(url));
});
