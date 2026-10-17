// Web Push: notifications on the student's phone even when SITTO isn't open.
import { apiClient } from './apiClient';
import { API_BASE_URL, USE_MOCK } from './config';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// iPhone/iPad only allow web push for sites added to the Home Screen (iOS 16.4+)
export function needsHomeScreenInstall() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  return isIOS && !standalone;
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  const api = new URL(API_BASE_URL, window.location.origin).href.replace(/\/$/, '');
  return navigator.serviceWorker
    .register(`/sw.js?api=${encodeURIComponent(api)}`, { scope: '/' })
    .catch(() => null);
}

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushStatus() {
  if (!isPushSupported()) return { supported: false, permission: 'unsupported', subscribed: false };
  const sub = await currentSubscription();
  return { supported: true, permission: Notification.permission, subscribed: Boolean(sub) };
}

export async function enablePush() {
  if (!isPushSupported()) throw new Error("This browser can't receive notifications.");
  if (needsHomeScreenInstall()) {
    throw new Error('On iPhone, first tap Share → "Add to Home Screen", then open SITTO from the Home Screen.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them for this site in your browser settings.');
  }

  const reg = (await navigator.serviceWorker.getRegistration('/')) || (await registerServiceWorker());
  if (!reg) throw new Error('Could not start the notification service. Please reload and try again.');
  await navigator.serviceWorker.ready;

  if (USE_MOCK) return { mock: true };

  const { publicKey } = await apiClient.get('/push/public-key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  await apiClient.post('/push/subscribe', sub.toJSON());
  return { subscribed: true };
}

// Re-link an existing device subscription to whoever is signed in now
export async function syncPushSubscription() {
  if (USE_MOCK || !isPushSupported() || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (sub) await apiClient.post('/push/subscribe', sub.toJSON()).catch(() => {});
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  if (!USE_MOCK) await apiClient.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export async function sendTestPush() {
  if (USE_MOCK) {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('SITTO notifications are on ✓', {
      body: "You'll get booking updates and SeatSure checks on this device.",
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
    });
    return;
  }
  return apiClient.post('/push/test');
}
