import { USE_MOCK } from './config';
import { mockStore } from '../mocks/mockStore';
import { apiClient } from './apiClient';
import { adaptReservation } from './adapters';
import { SEAT_STATUS, RESERVATION_STATUS } from '../utils/constants';

export async function createReservation({ spaceId, seatId, start, end }) {
  if (USE_MOCK) {
    await mockStore.delay(800);
    
    const spaceSeats = mockStore.getSeats(spaceId, start);
    if (!spaceSeats) throw new Error('Space not found');
    
    const seat = spaceSeats.find(s => s.id === seatId);
    if (!seat) throw new Error('Seat not found');
    if (seat.status !== SEAT_STATUS.AVAILABLE) {
      throw new Error(`Conflict: Seat ${seatId} is already ${seat.status}`);
    }

    // Update seat status
    seat.status = SEAT_STATUS.RESERVED;

    const startTime = start;
    const endTime = end;
    const checkInDeadline = new Date(new Date(start).getTime() + 15 * 60000).toISOString(); // 15 mins from start

    const newRes = {
      id: mockStore.generateReservationId(),
      spaceId,
      spaceName: mockStore.spaces.find(s => s.id === spaceId)?.name || spaceId,
      seatId,
      status: RESERVATION_STATUS.RESERVED,
      startTime,
      endTime,
      checkInDeadline,
      qrToken: `QR_TOKEN_${Date.now()}`,
    };

    mockStore.reservations.push(newRes);
    return newRes;
  }

  const raw = await apiClient.post('/reservations', {
    space_id: spaceId,
    seat_id: seatId,
    start,
    end,
  });
  return adaptReservation(raw);
}

export async function getReservation(id) {
  if (USE_MOCK) {
    await mockStore.delay();
    const res = mockStore.reservations.find(r => r.id === id);
    if (!res) throw new Error('Reservation not found');
    return res;
  }
  const raw = await apiClient.get(`/reservations/${id}`);
  return adaptReservation(raw);
}

export async function getMyReservations() {
  if (USE_MOCK) {
    await mockStore.delay();
    return [...mockStore.reservations]; // return copy
  }
  // TODO(contract): confirm endpoint
  const raw = await apiClient.get('/reservations/me');
  return raw.map(adaptReservation);
}

export async function checkIn(id, payload = {}) {
  // payload can contain qr_token or reservation_id
  if (USE_MOCK) {
    await mockStore.delay(600);
    const res = mockStore.reservations.find(r => r.id === id || r.qrToken === payload.qr_token);
    if (!res) throw new Error('Invalid QR or reservation ID');
    if (res.status !== RESERVATION_STATUS.RESERVED) throw new Error(`Reservation is ${res.status}`);

    res.status = RESERVATION_STATUS.CHECKED_IN;
    
    // Update seat status
    const spaceSeats = mockStore.seats[res.spaceId];
    if (spaceSeats) {
      const seat = spaceSeats.find(s => s.id === res.seatId);
      if (seat) seat.status = SEAT_STATUS.OCCUPIED;
    }

    return res;
  }

  const raw = await apiClient.post(`/reservations/${id}/checkin`, payload);
  return adaptReservation(raw);
}

export async function checkOut(id) {
  if (USE_MOCK) {
    await mockStore.delay();
    const res = mockStore.reservations.find(r => r.id === id);
    if (!res) throw new Error('Reservation not found');
    if (res.status !== RESERVATION_STATUS.CHECKED_IN) throw new Error('Not checked in');

    res.status = RESERVATION_STATUS.COMPLETED;

    // Update seat status
    const spaceSeats = mockStore.seats[res.spaceId];
    if (spaceSeats) {
      const seat = spaceSeats.find(s => s.id === res.seatId);
      if (seat) seat.status = SEAT_STATUS.AVAILABLE;
    }

    return res;
  }

  const raw = await apiClient.post(`/reservations/${id}/checkout`);
  return adaptReservation(raw);
}

export async function cancelReservation(id) {
  if (USE_MOCK) {
    await mockStore.delay();
    const res = mockStore.reservations.find(r => r.id === id);
    if (!res) throw new Error('Reservation not found');
    if (res.status !== RESERVATION_STATUS.RESERVED) throw new Error('Cannot cancel active reservation');

    res.status = RESERVATION_STATUS.CANCELLED;

    // Update seat status
    const spaceSeats = mockStore.seats[res.spaceId];
    if (spaceSeats) {
      const seat = spaceSeats.find(s => s.id === res.seatId);
      if (seat) seat.status = SEAT_STATUS.AVAILABLE;
    }

    return res;
  }

  const raw = await apiClient.post(`/reservations/${id}/cancel`);
  return adaptReservation(raw);
}

export async function adminVerify(payload) {
  if (USE_MOCK) {
    await mockStore.delay();
    const res = mockStore.reservations.find(r => 
      (payload.qr_token && r.qrToken === payload.qr_token) || 
      (payload.manual_code && r.id === payload.manual_code)
    );
    if (!res) throw new Error('Invalid QR code or reservation ID');
    return res;
  }
  const raw = await apiClient.post(`/admin/verify`, payload);
  return adaptReservation(raw);
}
