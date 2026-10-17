# SITTO security review (17 October 2026)

## Scope

- Backend: Flask API (`backend/app`) and the scheduler.
- Frontend: React app (`frontdend/src`).
- Dependencies, secrets in git history, and the database access model.

## Findings and fixes

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Critical | `run.py` started Flask with `debug=True` on `0.0.0.0`. The Werkzeug debugger lets anyone on the network run code on the server. | Debug only when `APP_ENV=development` **and** `FLASK_DEBUG=1`. Production is the default. Dev server binds to `127.0.0.1`. gunicorn is documented for production. |
| 2 | High | No rate limiting on login, signup or password reset (brute force, credential stuffing, email flooding). | Flask-Limiter: login 10/min and 50/h, signup 5/min, reset 3/min, 300/min global. Returns HTTP 429. |
| 3 | High | API errors returned raw exception text (database errors, internals). | Every 500 now returns a generic message; details are only logged on the server. JSON handlers for 404, 405, 413 and 429. |
| 4 | High | Known CVEs in `cryptography` 42.0.5, `requests` 2.32.3, `Flask` 3.0.3, `Flask-Cors` 4.0.1, `python-dotenv` 1.0.1 and `pytest` 8.2.2. | Upgraded to patched versions; `pip-audit` is clean. `npm audit` is clean. |
| 5 | Medium | CORS allowed every origin (`*`). | Only origins in `ALLOWED_ORIGINS`. |
| 6 | Medium | No security headers. | nosniff, `X-Frame-Options: DENY`, CSP, `Referrer-Policy`, `Permissions-Policy`, HSTS in production, `Cache-Control: no-store` on the API. The frontend build gets a CSP; nginx config is in DEPLOYMENT.md. |
| 7 | Medium | No server-side booking validation: any length, any hour, past dates, naive timestamps. | Enforces 30 min to 3 h, opening hours (IST), at most 3 days ahead, no past slots, timezone required, and type and length checks on IDs. |
| 8 | Medium | Campus, floor, space and seat endpoints were public. | Login now required. |
| 9 | Medium | Logout did not revoke the session; a stolen refresh token stayed valid. | Logout revokes the session in Supabase. A password change signs out other sessions. |
| 10 | Medium | Anyone with any email could sign up; minimum password length was 6. | Optional college-domain allowlist (`ALLOWED_EMAIL_DOMAINS`), 8+ characters with letters and numbers, and Supabase leaked-password protection (see DEPLOYMENT.md). |
| 11 | Medium | Signup said whether an email was already registered (account enumeration). | Same response for new and existing emails. Login uses one message for any failure. |
| 12 | Medium | Password-reset emails linked to `http://localhost:5173`. | Uses `FRONTEND_URL`. |
| 13 | Medium | Reset tokens stayed in the address bar and browser history. | Removed from the URL as soon as they are read. |
| 14 | Low | Mock mode accepts any password and could be switched on by an environment variable in a production build. | Mock mode only exists in the dev server and is stripped from production bundles. Demo quick-fill buttons removed. |
| 15 | Low | Reservation IDs were derived from a UUID integer prefix. | QR tokens use 256-bit `secrets.token_hex`; IDs use `secrets`. |
| 16 | Low | The admin blueprint copied the auth logic and reached into private module state. | One shared `authenticate_request()` / `require_admin`. JWT verification requires `exp`, `sub`, `iss` and `aud`, accepts ES256 only, and caches signing keys. |
| 17 | Low | Request size was unlimited. | 64 KB limit, both in Flask and in nginx. |
| 18 | Low | Google Fonts sent every visitor's IP address to Google. | Fonts are self-hosted. |
| 19 | Info | Unused heavy dependencies (three.js, react-three, GSAP, framer-motion). | Removed. |

## Checked, no issue

- **Secrets:** no real keys or `.env` files in the repo or its git history.
- **Database:** row-level security is on for every table with no policies, so only the backend's service role can access data.
- **Ownership checks** are present on reservations, cancellations, notifications and SeatSure responses.
- **Roles** come only from the server-side `profiles` table. Signup always creates students.

## Automated tests

`backend/tests/test_security.py` contains 86 offline tests (99 tests in the whole suite):

- anonymous access to all 23 protected routes;
- forged `alg:none` and HS256 tokens, plus malformed headers;
- students blocked from admin functions and from other users' data;
- signup domain, password and consent rules, with role injection ignored;
- no account enumeration on signup or login;
- rate limiting, oversized bodies and non-JSON bodies;
- error-message leakage, security headers and CORS;
- the debugger can't be enabled in production;
- booking-window rules;
- QR token randomness.

```bash
cd backend && .venv/Scripts/python -m pytest tests -q
```

## Remaining recommendations

- Old helper scripts in `backend/` (`check_e2e.py`, `test_cdp_*.py`) contain demo credentials such as `admin@sitto.edu` / `admin123`. Make sure no such accounts exist in the production Supabase project, and consider deleting these scripts.
- Access tokens are kept in `sessionStorage`. The CSP and React's escaping reduce the cross-site scripting (XSS) risk. Moving to HttpOnly cookies would need a backend-for-frontend change.
- Add self-service "download my data" and "delete my account" features. For now these rights are handled by email, as the Privacy Policy states.
- Run an external penetration test before a wide rollout.
