export const SEAT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  UNVERIFIED: 'UNVERIFIED',
  SELECTED: 'SELECTED', // UI only
};

// TODO(contract): confirm reservation status values
export const RESERVATION_STATUS = {
  RESERVED: 'RESERVED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
};

// TODO(contract): confirm confirmation task outcomes
export const SEATSURE_OUTCOME = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  RELEASED: 'RELEASED',
  EXPIRED: 'EXPIRED',
  ESCALATED: 'ESCALATED',
};

// Colors for statuses
export const STATUS_COLORS = {
  [SEAT_STATUS.AVAILABLE]: 'bg-status-available',
  [SEAT_STATUS.RESERVED]: 'bg-status-reserved',
  [SEAT_STATUS.OCCUPIED]: 'bg-status-occupied',
  [SEAT_STATUS.UNVERIFIED]: 'bg-status-unverified',
  [SEAT_STATUS.SELECTED]: 'bg-status-selected',
};

export const OPERATING_HOURS = {
  START: 8, // 8:00 AM
  END: 17, // 5:00 PM (closing time)
};

export const SESSION_DURATION_MINS = 60;
export const BOOKING_DAYS_AHEAD = 3;
