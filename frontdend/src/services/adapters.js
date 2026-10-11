/**
 * Adapters convert backend API responses into the shape expected by frontend components.
 * This is the only place where backend field names should be referenced.
 */

export function adaptBuilding(raw) {
  return {
    id: raw.id || raw.building_id,
    name: raw.name || raw.building_name,
  };
}

export function adaptFloor(raw) {
  return {
    id: raw.id || raw.floor_id,
    buildingId: raw.building_id,
    level: raw.level || raw.floor,
    name: raw.name || `Floor ${raw.level || raw.floor}`,
  };
}

export function adaptSpace(raw) {
  const configured = raw.configured_seats || raw.total_seats || raw.capacity || 0;
  // If backend returns explicit available_seats use it, else default to configured seats
  const available = raw.available_seats !== undefined && raw.available_seats !== null 
    ? raw.available_seats 
    : configured;

  return {
    id: raw.space_id || raw.id,
    name: raw.space_name || raw.name,
    type: raw.type, // e.g. 'Lab', 'Library'
    floorId: raw.floor_id,
    capacity: raw.total_seats || raw.capacity,
    availableSeats: available,
    configuredSeats: configured,
  };
}

export function adaptSeatMap(raw) {
  return {
    spaceId: raw.spaceId || raw.space_id,
    spaceName: raw.spaceName || raw.space_name,
    floor: raw.floor,
    totalSeats: raw.totalSeats || raw.total_seats,
    seats: (raw.seats || []).map(adaptSeat),
  };
}

export function adaptSeat(raw) {
  return {
    id: raw.seat_id || raw.id,
    status: raw.status, // EXPECTED: AVAILABLE, RESERVED, OCCUPIED, UNVERIFIED
  };
}

export function adaptReservation(raw) {
  return {
    id: raw.id || raw.reservation_id,
    spaceId: raw.spaceId || raw.space_id,
    spaceName: raw.spaceName || raw.space_name,
    seatId: raw.seatId || raw.seat_id,
    status: raw.status, // EXPECTED: RESERVED, CHECKED_IN, COMPLETED, CANCELLED, EXPIRED
    startTime: raw.startTime || raw.start_time,
    endTime: raw.endTime || raw.end_time,
    checkInDeadline: raw.checkInDeadline || raw.check_in_deadline,
    qrToken: raw.qrToken || raw.qr_token, // Provided upon reservation confirmation
  };
}

export function adaptNotification(raw) {
  return {
    id: raw.id || raw.notification_id,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    createdAt: raw.created_at,
    isRead: raw.is_read || raw.read,
    actionUrl: raw.action_url,
    expiresAt: raw.expires_at,
    reservationId: raw.reservation_id,
    seatsureTaskId: raw.seatsure_task_id,
  };
}
