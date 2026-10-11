import { USE_MOCK } from './config';
import { mockStore } from '../mocks/mockStore';
import { apiClient } from './apiClient';
import { adaptSeatMap } from './adapters';

export async function getSeatMap(spaceId, start, end) {
  if (USE_MOCK) {
    await mockStore.delay();
    const space = mockStore.spaces.find(s => s.id === spaceId);
    if (!space) throw new Error('Space not found');
    
    // In mock mode, we require start/end to get the correct session map
    if (!start) throw new Error('Start time required for session-based booking');

    const seats = mockStore.getSeats(spaceId, start);
    if (!seats) throw new Error('Failed to generate seats');

    return {
      spaceId: space.id,
      spaceName: space.name,
      floor: space.floorId,
      totalSeats: space.capacity,
      seats: seats,
    };
  }

  const raw = await apiClient.get('/seats', { space_id: spaceId, start, end });
  return adaptSeatMap(raw);
}
