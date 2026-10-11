# Sitto API Contract

This document outlines the API endpoints required by the Sitto student frontend.
All requests expect and all responses return JSON (`application/json`).
Authentication is done via the `Authorization: Bearer <token>` header.

## Authentication

### `POST /auth/login`
- **Implemented:** ❌ Gap (To be implemented)
- **Request Body:** `{ "username": "...", "password": "..." }`
- **Response:** `{ "token": "...", "user": { "id": "...", "name": "...", "role": "student|admin" } }`

### `POST /auth/logout`
- **Implemented:** ❌ Gap (To be implemented)
- **Auth:** Required
- **Response:** `204 No Content` or `{ "message": "Logged out" }`

## Campus & Spaces

### `GET /buildings`
- **Implemented:** ❌ Gap
- **Response:** `[ { "id": "BLD001", "name": "CSE Block" }, ... ]`

### `GET /floors`
- **Implemented:** ❌ Gap
- **Query Params:** `building_id`
- **Response:** `[ { "id": "FLR003", "buildingId": "BLD001", "level": 3, "name": "Third Floor" }, ... ]`

### `GET /spaces`
- **Implemented:** ❌ Gap
- **Query Params:** `floor_id`
- **Response:** `[ { "id": "LAB004", "name": "Computer Lab 4", "type": "Lab", "floorId": "FLR003", "capacity": 20, "availableSeats": 17 }, ... ]`

### `GET /seats`
- **Implemented:** ❌ Gap
- **Query Params:** `space_id`, `start` (ISO 8601), `end` (ISO 8601)
- **Response:** `{ "spaceId": "...", "spaceName": "...", "floor": "...", "totalSeats": 20, "seats": [ { "id": "A12", "status": "AVAILABLE|RESERVED|OCCUPIED|UNVERIFIED" } ] }`

## Reservations

### `POST /reservations`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Request Body:** `{ "space_id": "...", "seat_id": "...", "start": "...", "end": "..." }`
- **Response:** `{ "id": "RES1024", "spaceId": "...", "spaceName": "...", "seatId": "...", "status": "RESERVED", "startTime": "...", "endTime": "...", "checkInDeadline": "...", "qrToken": "..." }`

### `GET /reservations/:id`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Response:** Same as POST response

### `GET /reservations/me`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Response:** Array of reservation objects

### `POST /reservations/:id/checkin`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Request Body:** `{ "qr_token": "..." }` (Optional)
- **Response:** Updated reservation object with status `CHECKED_IN`

### `POST /reservations/:id/checkout`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Response:** Updated reservation object with status `COMPLETED`

### `POST /reservations/:id/cancel`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Response:** Updated reservation object with status `CANCELLED`

## Notifications & SeatSure

### `GET /notifications`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Response:** `[ { "id": "...", "type": "CONFIRMATION|INFO|SUCCESS", "title": "...", "message": "...", "createdAt": "...", "isRead": false, "expiresAt": "..." } ]`

### `POST /seatsure/:taskId/respond`
- **Implemented:** ❌ Gap
- **Auth:** Required
- **Request Body:** `{ "response": "YES|NO" }`
- **Response:** `{ "success": true }`

## Missing Functionality / Needs Backend Support
- `GET /availability`: To return valid one-hour sessions dynamically, including which are full or past. (Currently hardcoded in frontend).
