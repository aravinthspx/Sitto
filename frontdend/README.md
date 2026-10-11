# Sitto Student Frontend

**Every seat accounted for.**

Sitto is a software-only campus seat reservation and utilization platform for libraries, reading halls, and computer labs. This is the student-facing frontend application built with React and Vite.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher recommended)

## Installation

1. Clone the repository and navigate to the project root.
2. Run `npm install` to install dependencies.

## Configuration

Copy `.env.example` to `.env.local`:
\`\`\`bash
cp .env.example .env.local
\`\`\`

The following environment variables control the application's behaviour:

- \`VITE_USE_MOCK_DATA\`: Set to \`true\` to run the application entirely offline using in-memory mock data. Set to \`false\` to use the Flask backend.
- \`VITE_API_BASE_URL\`: The base URL for the backend API (e.g., \`http://localhost:5000/api\`). Used only when \`VITE_USE_MOCK_DATA=false\`.
- \`VITE_API_TIMEOUT_MS\`: HTTP request timeout in milliseconds (e.g., \`10000\`).
- \`VITE_POLL_INTERVAL_MS\`: Seat map polling interval in milliseconds (e.g., \`10000\`).

### Mock Mode Instructions

To run the application without a backend, ensure \`VITE_USE_MOCK_DATA=true\` in your \`.env.local\` file.
The application will use the \`src/mocks/mockStore.js\` to simulate a database. You can log in with any non-empty username and password. The mock database includes a primary demo path: **CSE Block → Floor 3 → Computer Lab 4 (LAB004)**.

### API Mode Instructions

1. Ensure the Flask backend is running.
2. Set \`VITE_USE_MOCK_DATA=false\` in \`.env.local\`.
3. Set \`VITE_API_BASE_URL\` to match the backend's address.
4. The application will not fall back to mock data on error; it will show API errors and a retry button.

## Commands

- **Run development server:** \`npm run dev\`
- **Build for production:** \`npm run build\`
- **Preview production build:** \`npm run preview\`

## Folder Structure

\`\`\`
src/
  app/            # App setup and routes
  components/     # Reusable UI elements (common, layout, seats, etc.)
  hooks/          # Custom React hooks (useAuth, usePolling)
  mocks/          # In-memory mock store and data
  pages/          # Top-level page components
  services/       # API clients, adapters, and business logic
  utils/          # Formatting tools and constants
  index.css       # Tailwind entry and design tokens
  main.jsx        # React root
\`\`\`

## Endpoints Used

The application expects the following provisional endpoints:

| Method | Path | Request Body | Expected Response Shape |
|---|---|---|---|
| POST | \`/auth/login\` | \`{ username, password }\` | \`{ token, user: { id, name } }\` |
| POST | \`/auth/logout\` | None | \`204 No Content\` or \`200 OK\` |
| GET | \`/buildings\` | None | \`[{ id, name }]\` |
| GET | \`/floors?building_id=...\` | None | \`[{ id, buildingId, level, name }]\` |
| GET | \`/spaces?floor_id=...\` | None | \`[{ id, name, type, floorId, capacity, availableSeats }]\` |
| GET | \`/seats?space_id=...\` | None | \`{ spaceId, spaceName, floor, totalSeats, seats: [{ id, status }] }\` |
| POST | \`/reservations\` | \`{ space_id, seat_id, duration_hours }\` | \`{ id, spaceId, spaceName, seatId, status, startTime, endTime, checkInDeadline, qrToken }\` |
| GET | \`/reservations/:id\` | None | Same as above |
| GET | \`/reservations/me\` | None | \`[Reservation]\` |
| POST | \`/reservations/:id/checkin\` | \`{ qr_token }\` or \`{ reservation_id }\` | \`{ id, status: 'CHECKED_IN', ... }\` |
| POST | \`/reservations/:id/checkout\`| None | \`{ id, status: 'COMPLETED', ... }\` |
| POST | \`/reservations/:id/cancel\` | None | \`{ id, status: 'CANCELLED', ... }\` |
| GET | \`/notifications\` | None | \`[{ id, type, title, message, createdAt, isRead, expiresAt }]\` |
| POST | \`/seatsure/:taskId/respond\` | \`{ response: 'YES' \| 'NO' }\` | \`{ success: true }\` |

## Items to Verify at Integration

- API base URL and CORS configuration.
- Exact field names in JSON requests and responses.
- Format of the \`qr_token\` returned by the reservation endpoint.
- Exact names of \`SEAT_STATUS\` (e.g. \`UNVERIFIED\` vs \`PENDING\`).
- Check-in deadline and duration boundaries.
- Authentication token structure (Bearer token vs cookies) and storage mechanism.

## Contract Gaps

- The \`/reservations/me\` endpoint name is provisional. Needs confirmation on how the backend prefers to list a student's reservations.
- Details of Supabase integration for authentication vs Flask. The current implementation relies on the Flask API to issue and validate tokens.
- The structure of the \`/seatsure/:taskId/respond\` payload.

## Known Limitations

- **Browser support:** QR scanning via the camera depends on browser support for the \`getUserMedia\` API. A manual fallback is provided.
- **Polling:** The seat map uses simple HTTP polling. A WebSocket integration could be considered if the backend supports it.
