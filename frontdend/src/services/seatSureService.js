import { USE_MOCK } from './config';
import { mockStore } from '../mocks/mockStore';
import { apiClient } from './apiClient';

export async function respondToSeatSurePrompt(taskId, response) {
  if (USE_MOCK) {
    await mockStore.delay();
    // mock handle logic
    return { success: true };
  }

  // If we don't have a specific task ID (due to missing DB column fallback), 
  // we can use the backend's respond-active endpoint which looks up the active task.
  if (!taskId || taskId === 'undefined') {
    const raw = await apiClient.post(`/seatsure/respond-active`, { response });
    return raw;
  }

  const raw = await apiClient.post(`/seatsure/${taskId}/respond`, { response });
  return raw;
}
