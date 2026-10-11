import { USE_MOCK } from './config';
import { mockStore } from '../mocks/mockStore';
import { apiClient } from './apiClient';
import { adaptBuilding, adaptFloor, adaptSpace } from './adapters';

export async function getBuildings() {
  if (USE_MOCK) {
    await mockStore.delay();
    return mockStore.buildings.map(adaptBuilding);
  }
  const raw = await apiClient.get('/buildings');
  return raw.map(adaptBuilding);
}

export async function getFloors(buildingId) {
  if (USE_MOCK) {
    await mockStore.delay();
    return mockStore.floors
      .filter(f => !buildingId || f.buildingId === buildingId)
      .map(adaptFloor);
  }
  const raw = await apiClient.get('/floors', { building_id: buildingId });
  return raw.map(adaptFloor);
}

export async function getSpaces(floorId) {
  if (USE_MOCK) {
    await mockStore.delay();
    return mockStore.spaces
      .filter(s => !floorId || s.floorId === floorId)
      .map(adaptSpace);
  }
  const raw = await apiClient.get('/spaces', { floor_id: floorId });
  return raw.map(adaptSpace);
}
