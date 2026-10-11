import { USE_MOCK } from './config';
import { mockStore } from '../mocks/mockStore';
import { apiClient } from './apiClient';
import { adaptNotification } from './adapters';

export async function getNotifications() {
  if (USE_MOCK) {
    await mockStore.delay();
    return mockStore.notifications.map(adaptNotification);
  }
  const raw = await apiClient.get('/notifications');
  return (raw || []).map(adaptNotification);
}

export async function getUnreadCount() {
  if (USE_MOCK) {
    await mockStore.delay();
    return mockStore.notifications.filter(n => !n.is_read).length;
  }
  const res = await apiClient.get('/notifications/unread-count');
  return res?.count ?? 0;
}

export async function markNotificationRead(notifId) {
  if (USE_MOCK) {
    await mockStore.delay();
    return { success: true };
  }
  return apiClient.post(`/notifications/${notifId}/read`);
}

export async function markAllNotificationsRead() {
  if (USE_MOCK) {
    await mockStore.delay();
    return { success: true };
  }
  return apiClient.post('/notifications/read-all');
}
