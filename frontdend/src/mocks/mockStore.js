import { SEAT_STATUS, RESERVATION_STATUS } from '../utils/constants';

// In-memory store for mock data to keep the session consistent
class MockStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.buildings = [
      { id: 'BLD01', name: 'CSE Block' },
      { id: 'BLD02', name: 'Main Library' },
    ];

    this.floors = [
      { id: 'FL01', buildingId: 'BLD01', level: 1, name: 'Ground Floor' },
      { id: 'FL02', buildingId: 'BLD01', level: 2, name: 'First Floor' },
      { id: 'FL03', buildingId: 'BLD01', level: 3, name: 'Third Floor' },
      { id: 'FL04', buildingId: 'BLD02', level: 1, name: 'Reading Hall 1' },
    ];

    this.spaces = [
      { id: 'LAB001', name: 'Computer Lab 1', type: 'Lab', floorId: 'FL02', capacity: 30, availableSeats: 15 },
      { id: 'LAB004', name: 'Computer Lab 4', type: 'Lab', floorId: 'FL03', capacity: 20, availableSeats: 17 },
      { id: 'LIB001', name: 'Quiet Reading Zone', type: 'Library', floorId: 'FL04', capacity: 50, availableSeats: 5 },
    ];

    // Seats are now generated per-session dynamically via getSeats()
    this.seats = {};

    this.reservations = [];
    this.notifications = [];
    this.currentUser = { id: 'STU12345', name: 'Demo Student' };
    this.reservationIdCounter = 1024;
  }

  // --- Helpers ---

  getSeats(spaceId, startIso) {
    const key = `${spaceId}_${startIso}`;
    if (!this.seats[key]) {
      const space = this.spaces.find(s => s.id === spaceId);
      if (!space) return null;

      const hour = new Date(startIso).getHours();
      const date = new Date(startIso).getDate();
      
      this.seats[key] = Array.from({ length: space.capacity }, (_, i) => {
        // Special case LAB004 like before but using A format
        const prefix = spaceId === 'LAB004' ? 'A' : 'S';
        const id = `${prefix}${String(i + 1).padStart(2, '0')}`;
        let status = SEAT_STATUS.AVAILABLE;
        
        // Deterministic pseudo-random statuses to simulate different sessions
        const seed = hour + date + i;
        if (seed % 5 === 0) status = SEAT_STATUS.OCCUPIED;
        else if (seed % 7 === 0) status = SEAT_STATUS.RESERVED;
        else if (seed % 13 === 0) status = SEAT_STATUS.UNVERIFIED;

        return { id, status };
      });
    }
    return this.seats[key];
  }

  generateReservationId() {
    return `RES${this.reservationIdCounter++}`;
  }

  delay(ms = 500) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const mockStore = new MockStore();
