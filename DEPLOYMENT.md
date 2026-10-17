# Deploying SITTO to production

SITTO is three pieces:

| Piece | What it is | How it runs |
|---|---|---|
| `frontdend/` | React single-page app | Static files built by Vite, served by nginx |
| `backend/` | Flask JSON API | gunicorn behind nginx |
| `backend/scheduler.py` | SeatSure timers and data-retention purge | A separate long-running process (exactly one copy) |

The database and logins are hosted by Supabase.

## 1. Supabase settings (dashboard)

- **Authentication → Providers → Email:** turn **Confirm email** on.
- **Authentication → Providers → Email:** turn on **Leaked password protection**, and set the minimum password length to 8.
- **Authentication → URL Configuration:**
  - Site URL: `https://<your-domain>`
  - Redirect URLs: `https://<your-domain>/login` and `https://<your-domain>/update-password`
- **Authentication → Rate Limits:** keep the defaults or lower them.
- **Project Settings → API:** the backend needs the **secret / service-role** key. It must only ever be on the server. Never put it in the frontend or in git.
- **Database → Tables:** confirm row-level security is **enabled with no policies** on every table, as in `backend/app/database/schema.sql`. Only the backend (service role) may read or write data.
- Delete any test or demo accounts, for example `admin@sitto.edu` or `student@sitto.edu`, which appear in old scripts in `backend/`.
- To make a staff member an admin, set `role = 'admin'` on their row in `public.profiles`. The app never lets users choose their own role.

## 2. Backend

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env    # then fill in every value
```

Required production values in `backend/.env`:

```ini
APP_ENV=production
FLASK_DEBUG=0
ALLOWED_ORIGINS=https://<your-domain>
FRONTEND_URL=https://<your-domain>
TRUSTED_PROXY_COUNT=1
ALLOWED_EMAIL_DOMAINS=srmist.edu.in
SUPABASE_URL=...
SUPABASE_KEY=...        # secret key
```

Run the API (never run `python run.py` in production):

```bash
.venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 run:app
```

With more than one worker, point rate limiting at Redis so the limits are shared: `RATELIMIT_STORAGE_URI=redis://127.0.0.1:6379`.

Run **one** scheduler process. It needs the same `.env`:

```bash
.venv/bin/python scheduler.py
```

Keep both running with systemd (or your platform's process manager), set to restart on failure.

## 3. Frontend

```bash
cd frontdend
npm ci
echo "VITE_API_BASE_URL=/api" > .env.production
npm run build            # output in frontdend/dist
```

`VITE_USE_MOCK_DATA` is ignored in production builds. The build puts a Content-Security-Policy into `index.html` automatically.

Before launch, fill in every `[bracketed]` placeholder in `frontdend/src/legal/siteInfo.js` (contact emails, Grievance Officer, address, Supabase region). Then have the college's legal or data-protection office review `/privacy` and `/cookies`.

## 4. nginx (HTTPS, security headers, API proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name <your-domain>;

    ssl_certificate     /etc/letsencrypt/live/<your-domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<your-domain>/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    server_tokens off;
    client_max_body_size 64k;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;

    root /var/www/sitto/dist;
    index index.html;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Server;
    }

    location / {
        try_files $uri /index.html;
    }
}

server {
    listen 80;
    server_name <your-domain>;
    return 301 https://$host$request_uri;
}
```

`camera=(self)` is needed because staff scan QR codes with the device camera on `/admin/scanner`.

## 5. Before go-live

- [ ] `backend/.venv/bin/python -m pytest backend/tests` passes.
- [ ] `pip-audit -r backend/requirements.txt` and `npm audit --omit=dev` report no vulnerabilities.
- [ ] `https://<your-domain>/health` returns `"database": "connected"`.
- [ ] Signing up with a non-college email is refused.
- [ ] A student account gets "Admin access required" on `/admin`.
- [ ] The legal placeholders in `siteInfo.js` are filled in and the policies are approved by the college.
- [ ] Database backups (Supabase → Database → Backups) are enabled.
