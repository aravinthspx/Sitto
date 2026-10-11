# FRONTEND_MASTER_PROMPT.md — SeatSure Student Frontend

> **Audience:** Antigravity (AI coding agent).
> **Team context:** A beginner-led team in a 24-hour hackathon. One teammate owns this student-facing frontend. Another teammate owns the Flask backend, Supabase database/Auth, SeatSure backend logic, and the admin dashboard.
> **Your job:** Build the SeatSure student frontend incrementally, verify every stage, and make it easy to connect to the real backend later.

---

## 0. How to Use This Document

1. Read this entire document before touching any file.
2. Work in the order given in **Section 21 (Implementation Plan)**. Finish and verify each stage before starting the next.
3. When this document and the backend team's `API_CONTRACT.md` disagree, **`API_CONTRACT.md` wins**. Fix the mismatch inside the service/adapter layer only (see Section 5).
4. Never write a large amount of untested code in one step. Run the app after every stage.
5. At the end, produce the honest report described in **Section 22**.

Rules that apply everywhere:

- **Never** claim a feature works unless you ran it and saw it work.
- **Never** present mock data as real campus data once API mode is on.
- **Never** claim the software physically detects whether someone is seated. SeatSure relies on student responses and human staff verification only.
- **Never** claim push notifications, SMS, or email exist. Only in-app notifications are in scope.

---

## 1. Project Overview

**Project name:** SeatSure
**Tagline:** *Every seat accounted for.*
**Hackathon problem statement:** Smart Campus Seat Availability and Utilization — Open Innovation, TH2-PS-OI-012, Problem Statement 12.

SeatSure is a **software-only** campus seat reservation and utilization platform for libraries, reading halls, and computer labs.

Students can:

- Browse campus buildings, floors, spaces, and individual seats.
- Reserve an available seat for a chosen duration.
- Check in by scanning a QR code (or entering the reservation ID manually for the demo).
- Check out when finished.
- Respond to **SeatSure occupancy-confirmation** prompts that reduce ghost reservations.

### Hard constraints

- 24-hour hackathon: prioritise a usable, demonstrable MVP over polish extras.
- **No** cameras for occupancy detection, physical sensors, IoT hardware, or ML-based occupancy detection. (The browser camera is used **only** to scan a QR code at check-in.)
- Build a realistic **working** MVP, not a static design prototype.
- Use mock data during independent development; make switching to the real backend a configuration change, not a rewrite.
- Do not build a second backend. Do not put private secrets in client code.

---

## 2. Technology Stack

| Concern | Choice |
|---|---|
| Framework | React |
| Build tool | Vite |
| Language | JavaScript (no TypeScript) |
| Styling | Tailwind CSS (configure per the **installed version's official docs**) |
| Routing | React Router |
| Icons | Lucide React |
| QR generation | A suitable React QR library (e.g. `qrcode.react`) — verify compatibility with the installed React version |
| QR scanning | A suitable browser-camera scanner (e.g. `html5-qrcode` or `@yudiel/react-qr-scanner`) — verify it works with browser camera permissions and the installed React version |
| HTTP | `fetch` (preferred, zero deps) or Axios |
| Config | Vite environment variables (`import.meta.env.VITE_*`) |

The backend (not your concern to build) uses Python, Flask, Supabase PostgreSQL, and Supabase Auth.

Rules:

- Keep dependencies **minimal**. Before installing, check whether the need can be met without a new package.
- After installing, confirm the app compiles and the libraries actually run (render a QR, open the scanner component) before building on them.
- If a library is incompatible with the installed React/Vite version, choose an alternative and note it in the README.

---

## 3. Shared Development Data — MUST MATCH THE BACKEND TEAM

The two teams work independently. The frontend must use the **same identifiers, statuses, and field names** as the backend team.

### 3.1 Canonical demo values

| Item | Value |
|---|---|
| Building | `CSE Block` |
| Floor | `3` |
| Space | `Computer Lab 4` |
| Space ID | `LAB004` |
| Total seats | `20` |
| Example seat IDs | `A12`, `A13`, `A14` |
| Example reservation ID | `RES1024` |

### 3.2 Canonical seat statuses (use uppercase everywhere)

- `AVAILABLE`
- `RESERVED`
- `OCCUPIED`
- `UNVERIFIED`

`SELECTED` is a **temporary frontend-only UI state** for the current user's selection. **Never** send `SELECTED` to the backend and never treat it as a persisted status.

Define these in one constants file (e.g. `src/utils/constants.js`) and import them. Never scatter string literals like `"AVAILABLE"` through components.

### 3.3 Status colours (design tokens)

| Status | Colour |
|---|---|
| AVAILABLE | Green |
| RESERVED | Yellow |
| OCCUPIED | Red |
| UNVERIFIED | Amber |
| SELECTED (UI only) | Blue |

**Accessibility:** colour must never be the only signal. Each seat/badge also needs a text label, and the legend must name every status. Yellow vs amber must be clearly distinguishable (e.g. different shade plus a distinct icon or pattern/border).

### 3.4 Reservation and task status values (PROVISIONAL — confirm against `API_CONTRACT.md`)

The backend contract defines the real values. Until confirmed, centralise provisional values in one constants file and map them in the adapter layer, for example:

- Reservation: `RESERVED` (awaiting check-in), `CHECKED_IN` (active), `COMPLETED`, `CANCELLED`, `EXPIRED`
- Confirmation task outcomes: pending / confirmed / released / expired / escalated

Do **not** invent final names. Flag every guessed value with a `// TODO(contract): confirm` comment and list them in the README under "Items to verify at integration".

### 3.5 Timestamps

- All dates/times use **ISO 8601** strings.
- Display in the user's **local time zone**.
- Do **not** calculate authoritative reservation or verification deadlines from the browser clock. Display deadlines the backend supplies. Countdowns are informational only (Section 10).

---

## 4. Environment Configuration

Create `.env.example` (committed) and instruct users to copy it to `.env.local` (git-ignored):

```
# "true" = run with mock data, no backend needed. "false" = use the Flask API.
VITE_USE_MOCK_DATA=true

# Flask backend base URL (used only when VITE_USE_MOCK_DATA=false)
VITE_API_BASE_URL=http://localhost:5000/api

# Request timeout in milliseconds
VITE_API_TIMEOUT_MS=10000

# Optional: polling interval for seat map refresh (ms)
VITE_POLL_INTERVAL_MS=10000
```

Rules:

- Ensure `.env`, `.env.local`, and similar files are in `.gitignore`.
- Only `VITE_`-prefixed values are exposed to the browser. **Never** put Supabase service-role keys or any private secret in any `VITE_` variable or in source.
- If Supabase Auth is used from the client, only the public **anon** URL/key may appear, and only if the backend team's contract says the client talks to Supabase directly. Default assumption: the client talks **only** to the Flask API.
- Switching modes must require **no component changes**.

---

## 5. Service Layer and API Integration

### 5.1 Architecture rules

- **No hardcoded sample records in components.** No scattered `fetch()` calls in components or pages.
- Pages call **hooks**; hooks call **services**; services call either the **mock implementation** or the **real API client** depending on `VITE_USE_MOCK_DATA`.
- All backend-specific mapping (field names, status values, timestamp shapes, error formats) lives in the service/adapter layer. If the real contract differs from the provisional one, change the adapter, **not** the UI.
- Each service exposes the **same function signatures** in both modes so components cannot tell the difference.

Suggested pattern (per service file):

```js
// src/services/seatService.js
import { USE_MOCK } from "./config";
import * as mock from "../mocks/mockSeatApi";
import { apiClient } from "./apiClient";
import { adaptSeatMap } from "./adapters";

export async function getSeatMap(spaceId) {
  if (USE_MOCK) return mock.getSeatMap(spaceId);
  const raw = await apiClient.get(`/seats`, { params: { space_id: spaceId } });
  return adaptSeatMap(raw);
}
```

### 5.2 `apiClient.js` responsibilities

- Configurable base URL from `VITE_API_BASE_URL`.
- JSON request/response handling.
- Attach the auth token per the agreed authentication flow (see Section 11).
- Request timeout (abort controller) using `VITE_API_TIMEOUT_MS`.
- Normalise errors into one shape, e.g. `{ status, code, message, details, isNetworkError }`, preserving the backend's message so the UI can show it.
- Handle `401` globally (clear session, redirect to login) and distinguish network failure from HTTP errors.
- Never log tokens or credentials.

### 5.3 API mode failure behaviour (IMPORTANT)

When `VITE_USE_MOCK_DATA=false`:

- **Do not silently fall back to mock data** on any failure.
- Show a useful error message, a loading state while waiting, and a **Retry** button.
- A visible badge/banner should indicate the current data source (e.g. "Demo data (mock mode)" vs live). In mock mode, label all statistics as demonstration data. In API mode, never show mock-derived numbers.

### 5.4 Proposed endpoints (PROVISIONAL — must be confirmed against `API_CONTRACT.md`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Student login |
| POST | `/auth/logout` | Logout |
| GET | `/buildings` | List buildings |
| GET | `/floors` | List floors (filter by building) |
| GET | `/spaces` | List spaces (filter by building/floor/type) |
| GET | `/seats?space_id=LAB004` | Seat map for a space |
| GET | `/availability` | Aggregate availability summaries |
| POST | `/reservations` | Create reservation |
| GET | `/reservations/:id` | Reservation details |
| POST | `/reservations/:id/checkin` | Check in (QR token or reservation ID) |
| POST | `/reservations/:id/checkout` | Check out |
| POST | `/reservations/:id/cancel` | Cancel |
| GET | `/notifications` | List notifications |
| POST | `/seatsure/:taskId/respond` | Respond YES/NO to a confirmation prompt |
| (TBD) | Current student's bookings, current student profile, seat availability | Confirm names in the contract |

These paths are **provisional, not a reason to invent a competing API**. If an endpoint you need is missing from the contract, record it in the README under "Contract gaps" and ask the backend teammate — do not invent behaviour.

### 5.5 Example seat-map response (use in mock mode)

```json
{
  "space_id": "LAB004",
  "space_name": "Computer Lab 4",
  "floor": 3,
  "total_seats": 20,
  "seats": [
    { "seat_id": "A12", "status": "AVAILABLE" },
    { "seat_id": "A13", "status": "OCCUPIED" },
    { "seat_id": "A14", "status": "RESERVED" }
  ]
}
```

This shows only three seats for readability. **Generate all 20 seats** in the mock dataset with stable IDs `A01`–`A20` (must include `A12`, `A13`, `A14`) and configurable sample statuses. Suggested layout: 4 rows × 5 columns, row-based, with a clear aisle or label.

### 5.6 Documentation requirement

In `README.md` (or `docs/API_USAGE.md`), document **every endpoint the frontend actually uses**: method, path, request fields, expected response fields, and how errors are handled. Keep it in sync with the adapter code.

### 5.7 Pre-integration verification checklist

Before declaring API mode ready, verify against `API_CONTRACT.md` and a running backend:

- [ ] API base URL
- [ ] Authentication flow and token handling
- [ ] Endpoint paths and HTTP methods
- [ ] Request and response field names
- [ ] Seat status values
- [ ] Reservation status values
- [ ] Timestamp formats
- [ ] Error response shape
- [ ] QR token format
- [ ] SeatSure response payload
- [ ] Seat-map and booking refresh behaviour

---

## 6. Screens (Student-Facing)

Build a cohesive, professional, responsive student app. Each screen must have **loading, empty, error (with Retry), and success** states.

### 6.A Dashboard (Landing)

- SeatSure branding and tagline.
- Welcome section for the logged-in student (name from authenticated session or mock identity only).
- Search/browse campus spaces.
- Quick-access cards for libraries and computer labs.
- Available / reserved / occupied seat summaries.
- Current reservation card (if any) and upcoming reservation details.
- Recent notifications.
- Quick actions: "Find a seat", "My bookings".
- Mock mode: clearly labelled demonstration data. API mode: real values only.

### 6.B Campus Navigation

Flow: **Campus → Building → Floor → Library/Lab → Seat Map.**

Students can browse buildings, select a floor, choose a space (library, reading hall, computer lab), see capacity and availability, **filter by space type and availability**, and navigate back **without losing context** (use route params / query params, not volatile component state).

Demo path: `CSE Block → Floor 3 → Computer Lab 4`.

### 6.C Interactive Seat Map (CORE FEATURE)

Inspired by the clarity of movie-ticket seat pickers, with **original** SeatSure branding and layout. Do **not** copy BookMyShow branding, logos, or proprietary assets.

Requirements:

- Visually organised grid; **seat ID shown inside each seat**.
- Legend covering all canonical statuses plus "Your selection".
- Colours per Section 3.3.
- Only seats eligible for reservation (`AVAILABLE`) are selectable. `RESERVED`, `OCCUPIED`, `UNVERIFIED` are **not** selectable (use `aria-disabled`, not just visual styling).
- Selecting a seat shows a **detail panel**: space name, floor, seat ID, status, and available actions (e.g. "Reserve this seat").
- Accessibility: each seat is a real `<button>` with an `aria-label` such as "Seat A12, Available"; keyboard navigable (Tab/Arrow keys/Enter/Space); visible focus ring; selection announced to screen readers (`aria-live`).
- Loading skeleton, API error state, empty state, and Retry.
- **Refresh strategy:** poll at `VITE_POLL_INTERVAL_MS` (pause when the tab is hidden), plus refresh after any reservation attempt, check-in, checkout, or cancellation. If the backend contract documents a realtime source, use that instead.
- If the selected seat becomes unavailable on refresh, clear the selection and tell the user.
- In API mode, never imply the on-screen status is authoritative: show a "Last updated hh:mm:ss" indicator and re-check on submit; the backend response decides.

### 6.D Reservation Flow

Steps: 1. Select space → 2. Select available seat → 3. Choose duration (1, 2, or 3 hours — or whatever the backend permits) → 4. Review seat/space/booking → 5. Confirm → 6. See result → 7. See **reservation ID and QR code**.

Requirements:

- **Prevent duplicate submissions** (disable button while pending; guard against double-click/Enter spam; use an in-flight ref, not only disabled state).
- Show success and failure messages; surface **server validation errors** clearly.
- **Do not show a successful reservation until the backend confirms** (in API mode).
- On a conflict response (seat taken by someone else): show the backend's message, clear selection, **refresh the seat map**.
- Use the **reservation ID returned by the backend**. Never generate an authoritative ID client-side in API mode.
- In mock mode, a mock service simulates the same flow (including generating `RES1024`-style IDs deterministically, starting with `RES1024` for the first demo reservation).
- Allowed durations come from the backend when supplied; otherwise use 1/2/3 hours as an adapter default flagged as provisional.

### 6.E QR Reservation Pass and Check-In

**Reservation pass** shows: reservation ID; building, floor, space; seat ID; start and end time; QR code; current booking status; check-in instructions (including the check-in deadline when the backend supplies it).

- The QR encodes the **agreed reservation token or identifier from the backend contract**. **Do not invent a token format.** If the contract is silent, encode only the reservation ID in mock mode and document it as a placeholder.

**Check-in page** with a scanner:

- Ask for camera permission **only when the user presses "Start scanning"** (never on page load).
- Explain how to grant permission if denied (browser site settings, per common browsers).
- Handle: permission denied, no camera available, unsupported browser, camera in use by another app.
- Always offer **manual reservation-ID entry** (demo/unsupported-device fallback).
- Stop the camera stream on unmount/success/cancel (no leaked streams).
- Submit the scanned value to the backend. **A scan is not proof of check-in** — only the backend's success response is.
- Handle and display: success, invalid QR, expired reservation, already checked-in, and other API errors.
- Never assume a client-side scan bypasses authentication or reservation checks.

### 6.F My Reservations

Tabs/filters: **Upcoming | Active | Completed | Cancelled/Expired**.

Each booking card: reservation ID; space and seat; start/end times; status badge; QR pass where appropriate; **Check in** (when eligible); **Check out** (when checked in); **Cancel** (when allowed).

- Confirmation dialogs before cancellation and checkout.
- Update the UI from the **backend's response**, never by assuming success.
- Empty state per tab.

### 6.G Active Booking and Checkout

For a checked-in student: active seat and space; check-in time; original booking end time; SeatSure confirmation status (if any); **Checkout** button.

- On checkout success: update the reservation display and **refresh availability**.
- **Never extend the booking** in the UI because the student answered a SeatSure prompt. The end time shown is whatever the backend returns, and a YES must not change the original end time.

### 6.H Notifications Centre

See Section 9.

### 6.I Login

See Section 11.

---

## 7. SeatSure Occupancy Confirmation Workflow (Student UI)

SeatSure is a **software workflow to reduce ghost reservations — not a sensor-based presence detector.** The frontend only displays prompts and relays the student's answer; **the backend owns all deadlines, transitions, and race conditions.**

### 7.1 Midpoint confirmation (after check-in)

- After a successful check-in, the **backend** computes the midpoint of the booked duration from the **actual check-in time** (e.g. a 3-hour booking → prompt 1.5 hours after check-in).
- At the midpoint the backend creates a confirmation request. The frontend shows an in-app prompt/notification: **"Are you still using your seat?"**
- Actions: **"YES, I'm here"** and **"NO, release my seat"**.
- Response deadline: **3 minutes** after the request is created (backend-controlled).

Frontend behaviour:

- Display the deadline (from the backend) and an **informational** countdown. If the countdown reaches zero locally, refetch the task state from the backend instead of declaring the outcome yourself.
- Submit the response through the service layer.
- **YES** → show: seat remains occupied until the **original** booking end.
- **NO** → show: session ended, seat released.
- Deadline passed → show: confirmation expired; staff verification may be required (once the backend confirms the escalation).
- Disable both buttons after one is pressed; prevent double submit; handle a late-response error from the backend gracefully ("This request has already expired").

### 7.2 Admin verification escalation

If the student does not respond within 3 minutes, the backend creates an **admin verification task** and marks the seat `UNVERIFIED`.

The student UI shows:

- A clear SeatSure escalation notification.
- Seat and space details.
- Current booking status.
- A message that **staff verification is pending**.

**Do not build an admin workflow in the student app.** The admin dashboard belongs to the backend/admin teammate.

Admin outcomes (the student UI must simply **display the authoritative result when updated data arrives**):

- `PRESENT` → session returns to `OCCUPIED`, **original booking end time unchanged**.
- `ABSENT` → session terminated, seat released.
- No admin response within 5 minutes → backend terminates the session and releases the seat.

### 7.3 UI must correctly reflect

Checkout, reservation cancellation, original booking expiry, confirmation expiry, seat release, and **invalidated** pending confirmation requests (e.g. the student checked out while a prompt was open: remove or mark the prompt as no longer applicable).

**Do not implement authoritative deadline logic in React.** No `setTimeout`-driven state transitions that change booking/seat status on the client.

### 7.4 Mock simulation

In mock mode, provide a **demo control** (clearly labelled "Demo controls — mock mode only", hidden in API mode) to trigger: midpoint prompt, student non-response → escalation, admin PRESENT, admin ABSENT, and initial check-in reminder. This lets the team demo the whole flow without a backend. These controls must live in the mock layer and never ship as a feature of API mode.

---

## 8. Initial Reservation Check-In Timeout

A reserved seat has a **15-minute initial check-in window**, controlled by the backend.

If the student does not check in within that window, the backend may issue a confirmation request. The student then has **90 seconds** to respond:

- **YES** → grants the **single final 10-minute check-in extension**.
- **NO** → cancels the reservation, releases the seat.
- **No response within 90 seconds** → cancels the reservation, releases the seat.
- **No check-in before the final extension expires** → seat released.
- If check-in happens before the applicable deadline, the backend invalidates pending release tasks.

Frontend requirements:

- Display the check-in deadline **when the backend supplies it**.
- Show a reminder/prompt when the backend reports one.
- Provide **YES / NO** actions when applicable.
- Clearly show the **final extension** (and that it is the last one).
- Show cancellation/expiry outcomes from the backend.
- **Never implement this workflow with browser timers alone.** Countdowns are cosmetic; state comes from the backend.

---

## 9. Notifications and User Feedback

Create an in-app **notification centre** (page plus a bell/badge in the layout) with example notification types:

- Reservation confirmed
- Reservation cancelled
- Upcoming check-in deadline
- Initial check-in reminder
- SeatSure midpoint confirmation
- SeatSure escalation to staff
- Seat released
- Booking completed

Rules:

- Mock mode: a clearly separated mock notification service.
- API mode: load from the backend and follow its response contract; poll at a modest interval.
- Actionable notifications (confirmation prompts) deep-link to the relevant prompt/booking.
- Empty state for "no notifications".
- **Do not claim** push notifications, SMS, or email exist. In-app only.
- Use toast messages, status badges, inline validation, confirmation dialogs, and accessible feedback (`role="status"` / `aria-live` for toasts, focus management in dialogs).

---

## 10. Backend Authority Rules (Summary)

The backend is the source of truth for: reservation creation and IDs, seat status, check-in validity, deadlines, SeatSure transitions, admin outcomes, and conflicts.

The frontend **may**: show informational countdowns, optimistically disable buttons, and poll/refresh.

The frontend **must not**: mark a reservation successful before confirmation, decide that a deadline has expired, change seat status locally in API mode, extend bookings, or resolve admin tasks.

---

## 11. Authentication and Student Identity

- Build a student **login page** consistent with the design system.
- Use the authentication flow agreed in `API_CONTRACT.md`. Keep auth logic in `authService.js` and an auth context/hook — **not** in UI components.
- Handle invalid credentials, loading, and network errors with clear messages.
- **Protect authenticated routes** (redirect to login; remember the intended destination).
- Provide a clear **logout** flow (call the backend if specified; clear client session).
- Display student information **only from the authenticated session** (or the agreed mock identity in mock mode).
- **Never** store credentials in source. **Never** expose Supabase service-role keys.
- **Never trust client-supplied student IDs** for security-sensitive operations: do not send `student_id` in reservation/check-in/checkout requests unless the contract explicitly requires it; the backend should derive identity from the token.
- Token storage: follow the contract. If a token must be kept client-side, document the trade-off (e.g. `sessionStorage` vs `localStorage`) in the README. Do not log it.
- If real auth is not ready: provide a **clearly labelled demo login** in mock mode (e.g. banner "Demo login — not secure authentication") and document how it will be replaced. Do not pretend demo auth is production security.

---

## 12. Visual Design Requirements

Design direction: a polished, modern, professional campus-tech product.

- Clean dashboard layout with strong visual hierarchy.
- Consistent spacing and typography.
- Professional navigation (sidebar on desktop, top bar/bottom nav or drawer on mobile).
- Cards with restrained borders and shadows.
- Clear status badges.
- Responsive seat-map layout (works at ~360px width without horizontal page scrolling; the seat grid may scroll within its container if needed).
- Consistent button styles.
- Accessible contrast (aim for WCAG AA) and keyboard navigation.
- Meaningful loading **skeletons**, empty states, friendly error messages with retry controls.

### Design system (create first, reuse everywhere)

Define in Tailwind config / a small `components/common/` library:

- Brand colours (pick a calm, trustworthy primary; define in the Tailwind theme).
- Status colours (Section 3.3) as named tokens.
- Typography scale.
- Spacing rules.
- Reusable: `Button`, `Card`, `Input`/form fields, `Dialog`/`ConfirmDialog`, `Toast`, `StatusBadge`, `Skeleton`, `EmptyState`, `ErrorState` (with Retry), `Spinner`.

Avoid over-complicated animations, decorative filler sections, and excessive dependencies. A usable demo beats ornament.

---

## 13. Suggested Project Structure

```
src/
  app/
    App.jsx
    routes.jsx
  components/
    common/          # Button, Card, Input, Dialog, Toast, StatusBadge, Skeleton, EmptyState, ErrorState
    layout/          # AppShell, Sidebar, TopBar, ProtectedRoute
    seats/           # SeatGrid, Seat, SeatLegend, SeatDetailPanel
    reservations/    # ReservationCard, DurationPicker, ReservationSummary
    qr/              # QrPass, QrScanner, ManualEntry
    notifications/   # NotificationList, NotificationItem, SeatSurePrompt, Countdown
  pages/
    LoginPage.jsx
    DashboardPage.jsx
    BuildingsPage.jsx
    SpacesPage.jsx
    SeatMapPage.jsx
    ReservationPage.jsx
    ReservationPassPage.jsx
    CheckInPage.jsx
    MyReservationsPage.jsx
    ActiveBookingPage.jsx
    NotificationsPage.jsx
  services/
    config.js
    apiClient.js
    adapters.js      # backend <-> frontend shape mapping (single place to adapt)
    authService.js
    buildingService.js
    seatService.js
    reservationService.js
    seatSureService.js
    notificationService.js
  mocks/
    buildings.js
    spaces.js
    seats.js
    reservations.js
    notifications.js
    mockStore.js     # in-memory session state shared across mock services
    mock*Api.js      # mock implementations of each service
  hooks/             # useAuth, useSeatMap, useReservations, useNotifications, usePolling
  utils/             # constants.js, time.js, errors.js
  styles/
.env.example
README.md
```

Adjust only for a good technical reason. Keep **mock data, service logic, reusable components, and page components separate.** Do **not** put the whole app in one giant component. Prefer small, focused components and custom hooks.

---

## 14. Mock Mode Requirements

The frontend **must run independently** before the backend is ready.

Implement mock service methods for:

- Login / demo identity
- Buildings, floors, spaces
- Seat map
- Create reservation
- Reservation details
- Check in
- Check out
- Cancel reservation
- Notifications
- Respond to SeatSure prompts
- Refresh booking status

Rules:

- **Keep the dataset consistent across screens.** A successful mock reservation updates the mock seat map **and** the student's reservation list for the session (use an in-memory `mockStore`).
- Include several buildings/floors/spaces (e.g. a Library reading hall and another lab) so navigation and filters are meaningful, but `CSE Block → Floor 3 → Computer Lab 4 (LAB004, 20 seats)` is the primary demo path.
- Mock seat map for LAB004: include a mix of `AVAILABLE`, `RESERVED`, `OCCUPIED`, and at least one `UNVERIFIED` seat, with `A12` AVAILABLE, `A13` OCCUPIED, `A14` RESERVED by default.
- Use **stable sample IDs and deterministic data** wherever practical.
- Simulate realistic latency (e.g. 300–600 ms) and allow **simulated failures** (conflict, invalid QR, expired reservation, network error) via a dev toggle so error states can be tested.
- **Never report that a real backend operation occurred in mock mode.** Mock-mode UI should carry a visible "Demo data" indicator, and mock success messages must not claim server confirmation.
- Optional: allow resetting the mock store (a "Reset demo data" action visible in mock mode only).

---

## 15. Security Requirements

- No secrets in source or `VITE_` variables. **No Supabase service-role key anywhere in the frontend.**
- `.env` files git-ignored; `.env.example` contains placeholders only.
- Don't trust client-supplied identity; the backend derives the student from the auth token.
- Do not log tokens, passwords, or full QR payloads to the console.
- Escape/handle server-supplied strings safely (React escaping by default; **never** use `dangerouslySetInnerHTML` with API data).
- Validate user input client-side for UX (e.g. non-empty reservation ID), but treat server validation as authoritative.
- Camera: request permission only on user action; stop streams when finished; do not record or upload camera frames — only the decoded QR text is used.
- A scan or a client-side flag never grants check-in; only the backend response does.
- Clear session state on logout and on `401`.
- Be honest in UI copy: do not claim SeatSure detects presence; it asks the student and relies on staff verification.

---

## 16. Full User Journey (Reference)

1. Student logs in (demo login in mock mode / real auth in API mode).
2. Dashboard shows welcome, summaries, current/upcoming booking, notifications.
3. Student browses **CSE Block → Floor 3 → Computer Lab 4**.
4. Seat map loads (20 seats); student selects an `AVAILABLE` seat (e.g. `A12`).
5. Detail panel appears; student chooses a duration and reviews details.
6. Student confirms; button locks to prevent duplicates.
7. On backend confirmation: reservation ID (e.g. `RES1024`) and **QR pass** appear.
8. The initial check-in deadline is displayed (when supplied). A reminder may appear.
9. Student checks in via QR scanner (or manual ID entry); backend validates.
10. Active booking page shows seat, check-in time, original end time.
11. At the midpoint, the SeatSure prompt appears: "Are you still using your seat?" with a deadline/countdown.
12. Student answers YES (stays until original end) or NO (released); or ignores it → escalation notice, seat `UNVERIFIED`, staff verification pending → backend outcome (PRESENT / ABSENT / timeout) is displayed.
13. Student checks out (with confirmation dialog); reservation moves to Completed; availability refreshes.
14. Alternative paths: cancellation before check-in; no check-in within 15 minutes → confirmation prompt (90 s) → YES gives the single final 10-minute extension / NO or timeout releases the seat.

---

## 17. Error, Loading, and Empty States (Checklist)

Every data-driven screen must handle:

- **Loading:** skeletons or spinners; no layout jumps.
- **Empty:** no buildings/spaces/seats/reservations/notifications — friendly message plus a next action.
- **Error:** message from the backend when available; generic friendly fallback otherwise; a **Retry** button.
- **Network failure:** distinct message ("Can't reach the SeatSure server").
- **Auth expiry:** redirect to login with a notice.
- **Conflict:** show the backend message, refresh the data.
- **Submission in flight:** disabled controls plus progress indicator; no duplicate requests.

---

## 18. Testing Checklist

Manually verify each (and write unit/component tests if time permits, prioritising reservation and service logic):

1. Dashboard opens.
2. Navigate to CSE Block → Floor 3 → Computer Lab 4.
3. Select an available seat.
4. Reserve it successfully.
5. See the reservation ID and QR pass.
6. Check in via the scanner or manual demo entry.
7. See the active booking.
8. Check out successfully.
9. An occupied seat cannot be reserved.
10. A seat reserved by another student cannot be reserved again (conflict handled, seat map refreshed).
11. Invalid and expired QR tokens are handled.
12. Camera permission denial is handled (with guidance and manual entry fallback).
13. Backend connection failure is handled (error plus Retry; **no** silent mock fallback in API mode).
14. SeatSure YES and NO responses show the correct server results.
15. An expired confirmation shows the escalation state.
16. Cancellation and expiry refresh the displayed availability.
17. Empty reservation lists and empty notifications render correctly.
18. Layout works at desktop and mobile widths.
19. Repeated clicks do not create duplicate submissions.
20. Mock and API modes switch via `.env.local` alone, with no component rewrites.

Also verify: keyboard-only navigation of the seat map; screen-reader labels on seats; `npm run build` succeeds; no console errors in the main journey.

**Suggested test tooling (optional, minimal):** Vitest + React Testing Library. Prioritise: reservation service (mock), seat-selection eligibility, status/adapter mapping, duplicate-submit guard.

---

## 19. Integration Rules for the Two Teams

- The frontend teammate owns the student UI. The other teammate owns Flask APIs, Supabase schema/seed data, SeatSure backend logic, and the admin dashboard.
- Both teams use the same: canonical seat statuses; building/floor/space/seat/reservation example IDs; reservation and session concepts; timestamp conventions (ISO 8601); API contract; field names and status transitions.
- `API_CONTRACT.md` (backend team) **takes priority** over provisional examples here.
- Keep all API-specific mapping in the service/adapter layer.
- Mock data is **not** shared with the backend; each team keeps its own development data until integration. After switching to API mode, the backend/database is the source of truth.
- At integration time: set `VITE_USE_MOCK_DATA=false`, set `VITE_API_BASE_URL`, confirm CORS with the backend teammate (the Flask app must allow the frontend's origin), then walk through Section 5.7 and the Section 18 checklist against the real API.

---

## 20. Dependencies and Setup Notes

- Check `node -v` and `npm -v` first; confirm they satisfy Vite's and the chosen libraries' requirements. Report any mismatch rather than forcing it.
- Use the official Vite React (JavaScript) template if creating the app.
- Configure Tailwind per the **installed version's official documentation** (setup differs between major versions — do not copy outdated config).
- Install only what is required: `react-router-dom`, `lucide-react`, a QR generator, a QR scanner, and (optionally) `axios`, `vitest`, `@testing-library/react`.
- Commit-friendly: keep a clean `.gitignore`, no committed `node_modules`, no committed `.env`.

---

## 21. Antigravity Implementation Plan (Work Incrementally)

After **each** stage: run the app (or build), fix errors, and briefly note what was verified before continuing.

1. **Inspect first.** Look at the existing repo, installed tools, `package.json`, and any existing source. **Preserve useful existing work**; do not blindly overwrite.
2. **Check tool versions** (Node, npm). Note them.
3. **Create or repair the React + Vite app.** Confirm `npm run dev` serves a page.
4. **Configure Tailwind CSS** per the installed version's official setup. Confirm utility classes render.
5. **Install required dependencies only.** Confirm the app still compiles; smoke-test the QR generator and scanner libraries.
6. **Build the shared design system and layout:** tokens, common components, app shell (sidebar/top bar), routing skeleton, protected route, toast provider.
7. **Implement constants and the mock + service layers:** `config.js`, `apiClient.js`, `adapters.js`, mock data (20 LAB004 seats, buildings, spaces, reservations, notifications, student), `mockStore`, all services with identical signatures in both modes.
8. **Auth (mock demo login first), dashboard, and navigation** (Campus → Building → Floor → Space).
9. **Seat map:** grid, legend, selection rules, detail panel, accessibility, polling, loading/error/empty states.
10. **Reservation flow and QR pass:** duration picker, review, duplicate-submit guard, conflict handling, pass page with QR.
11. **Check-in (scanner plus manual entry), My Reservations, Active Booking and checkout, cancellation dialogs.**
12. **SeatSure UI and initial check-in timeout UI,** plus mock-mode demo controls for midpoint, escalation, admin outcomes, and the initial-window prompt.
13. **Notification centre** and bell badge.
14. **Connect to the agreed API contract:** read `API_CONTRACT.md` if present; update `adapters.js` and services; implement real auth; **no silent fallback to mock**; verify per Section 5.7. If the contract or backend isn't available yet, say so, leave API mode implemented-but-unverified, and list the gaps.
15. **Complete loading, error, empty, and success states** everywhere (Section 17).
16. **Run and fix** compilation and runtime errors (`npm run dev`, `npm run build`).
17. **Test the core demo journey** and the Section 18 checklist in mock mode; test API mode only if a backend is reachable.
18. **Update `README.md`:** project summary; prerequisites; install; configuration (`.env.example` fields); **mock mode** instructions; **API mode** instructions; run/build/test commands; folder structure; endpoints used (Section 5.6); "Items to verify at integration"; "Contract gaps"; known limitations.
19. **Report honestly** (Section 22).

Guardrails while building:

- Do not skip ahead; a working seat map and reservation flow in mock mode matters more than finishing every edge case.
- If time is short, cut in this order (last to first): extra animations, unit tests, advanced filters. **Never** cut: seat map, reservation flow, QR pass, check-in, checkout, SeatSure prompt display, error handling, README.
- Keep each component small and focused; prefer hooks for data logic.

---

## 22. Final Report Required From Antigravity

When finished (or when stopping), produce a report with:

1. **Implemented and verified** — features you actually ran and observed, each with how you verified it.
2. **Implemented but unverified** — e.g. API mode against a real backend you could not reach.
3. **Not implemented / incomplete** — be explicit.
4. **Provisional assumptions** — every guessed endpoint, field, status value, or token format, with its file location, so the team can compare against `API_CONTRACT.md`.
5. **Contract gaps / questions for the backend teammate.**
6. **Known issues** and the exact commands to run, test, and build.
7. **Library choices** (QR generator, scanner) and any compatibility notes.

Do not overstate. If something doesn't work, say so.

---

## 23. Final Reminders (Read Before Starting)

- SeatSure is **software-only**: no sensors, no occupancy-detection camera, no ML.
- The backend owns truth, deadlines, and transitions; the frontend displays and relays.
- Canonical statuses: `AVAILABLE`, `RESERVED`, `OCCUPIED`, `UNVERIFIED` (`SELECTED` is UI-only).
- Demo data: `CSE Block` / Floor `3` / `Computer Lab 4` / `LAB004` / 20 seats / `A12`, `A13`, `A14` / `RES1024`.
- Mock and API modes are separated by one environment variable; **never silently fall back** in API mode.
- `API_CONTRACT.md` overrides this document; fix mismatches in the adapter layer.
- No secrets in client code. No service-role keys.
- Verify at every stage. Report honestly.
