# Deployment & Free OTP Email — Nextdoor Rewari

This app is a **hyperlocal community platform for Rewari** (28.1928°N, 76.6186°E). It is
self-hosted end-to-end — the frontend is a React 19 + Vite 8 SPA and the backend is an
Express + better-sqlite3 REST API. There is **no Appwrite dependency** anymore; the older
`docs/APPWRITE_SETUP.md` and `docs/VERCEL_DEPLOYMENT.md` are outdated and can be ignored.

**Every circle and channel is PIN-protected. Every write action requires a logged-in
user.** Logins are passwordless via email OTP (free tier options below). Business
listings/ratings are readable by anyone; posting, reviewing, joining circles, messaging,
and nearby sync all require login.

## Architecture

```
frontend/  React 19 + Vite 8 + PWA (offline-first via IndexedDB)
  └── calls  /api/*  ->  proxy to backend in dev, VITE_API_URL in prod
backend/   Express + better-sqlite3 (single SQLite file in data/app.db)
  └── JWT auth (bearer token), email OTP (Resend | SMTP | console)
  └── static-serves frontend/dist in production
```

Local-first data (posts you create, circle messages, saved pins) is stored in the
browser's IndexedDB and synced to the API when online. Messages are ephemeral
(in-memory on the server); the SQLite DB holds users, posts, comments, businesses,
reviews, circles, channels, buildings, and emergency contacts.

## 1. Local development

```bash
# install workspace deps (root has npm workspaces)
npm install

# backend
cd backend
cp .env.example .env        # fill in JWT_SECRET etc.
npm run seed                # optional: seed Rewari data + admin (see §4)
npm run dev                 # API on http://localhost:4000

# frontend (separate terminal)
cd frontend
cp .env.example .env        # leave VITE_API_URL empty (dev proxy -> :4000)
npm run dev                 # SPA on http://localhost:5173
```

Open `http://localhost:5173`. In dev the email provider defaults to `console`, so the
OTP is printed in the **backend terminal** — use it to log in.

## 2. Free email OTP — choose one provider

Set `EMAIL_PROVIDER` in `backend/.env` to one of:

### A. Resend (recommended, free 3,000 emails/month)
1. Sign up at https://resend.com, add a domain (or use the default `onboarding@resend.dev`).
2. Create an API key at https://resend.com/api-keys.
3. Configure:
   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxx
   MAIL_FROM=Nextdoor Rewari <onboarding@resend.dev>
   ```
   If you add your own domain, set `MAIL_FROM=Nextdoor Rewari <no-reply@yourdomain.com>`.
4. Restart the backend.

### B. Gmail SMTP (free, 500/day) — App Password
1. Enable 2-Step Verification on the Google account, then create an App Password at
   https://myaccount.google.com/apppasswords.
2. Configure:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=you@gmail.com
   SMTP_PASS=your-16-char-app-password
   MAIL_FROM=Nextdoor Rewari <you@gmail.com>
   ```
3. Restart the backend.

### C. Console (development only)
```env
EMAIL_PROVIDER=console
```
OTPs print to the backend terminal. Never use this in production.

> The `/api/auth/otp/request` endpoint is rate-limited to 5 requests per 15 minutes per
> IP, and each email has a 60-second resend cooldown.

## 3. Backend environment variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | API port | `4000` |
| `NODE_ENV` | `development` / `production` | `production` |
| `DATABASE_PATH` | SQLite file path (relative to backend dir) | `./data/app.db` |
| `JWT_SECRET` | Long random string — change it! | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:5173,https://your-frontend.vercel.app` |
| `OSRM_BASE_URL` | OSRM routing server | `https://router.project-osrm.org` |
| `SEED_ADMIN_EMAIL` | Email promoted to `admin` on seed (see §4) | `admin@rewari.local` |
| `EMAIL_PROVIDER` | `console` \| `resend` \| `smtp` | `resend` |
| `MAIL_FROM` | From address on OTP emails | `Nextdoor Rewari <no-reply@yourdomain.com>` |
| `RESEND_API_KEY` | Resend key (provider = resend) | `re_xxxxxxxx` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP settings (provider = smtp) | `smtp.gmail.com` / `465` / `true` |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (provider = smtp) | `you@gmail.com` / app password |

### Frontend variable

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Your deployed API origin, e.g. `https://your-backend.onrender.com`. Leave empty in dev (the Vite proxy handles `/api`). |

## 4. Seeding Rewari data + admin bootstrap

`npm run seed` (in `backend/`) creates the schema if needed and loads:
- 33 real Rewari buildings, ~28 real Rewari businesses (01274 numbers) with offers,
  6 emergency contacts (112/108/101/1091), and 10 reference posts.
- 3 PIN-protected circles with 9 PIN-protected channels.
- The **admin account**: set `SEED_ADMIN_EMAIL` in `.env` **before** running the seed;
  that email is created with role `admin` (promote one co-admin + one elder to reach the
  intended 1 admin / 3 co-admins / 7 elders hierarchy — roles are managed by an admin in
  the app).

There are **no demo credentials** — login is always email OTP. `SEED_ADMIN_EMAIL` is only
bumped to admin when the seed runs and that email is missing.

## 5. Production deployment

### Frontend → Vercel
1. Import the repo, set **Root Directory** to `frontend`, Framework Preset `Vite`,
   Build Command `npm run build`, Output Directory `dist`.
2. Add env var `VITE_API_URL=https://<your-backend-url>` for Production/Preview.
3. `frontend/vercel.json` contains the SPA rewrite so client routes work on refresh.

### Backend → Render (or Railway/Fly.io)
1. Create a Web Service from the repo; Root Directory `backend`, Build Command
   `npm install && npm run build`, Start Command `npm start`.
2. **Add a persistent disk** (e.g. 1 GB mounted at `/var/data`) and set
   `DATABASE_PATH=/var/data/app.db` so SQLite survives deploys/restarts. Without a
   persistent disk the DB resets on every redeploy.
3. Set the remaining env vars from §3, with `NODE_ENV=production`, `EMAIL_PROVIDER=resend`
   (or `smtp`), and `CORS_ORIGIN=https://<your-frontend.vercel.app>`.
4. On first deploy run `npm run seed` (Render → Shell, or a one-off command) to create
   the admin and seed Rewari data.
5. In production the backend also serves the built frontend from `frontend/dist` if it
   exists, so a single Render service can serve both — but the standard setup is
   Vercel (frontend) + Render (API).

### Build verification
```bash
cd backend && npm run build && npm start    # verify it boots
cd frontend && npm run build                 # zero TS errors + dist output
```

## 6. Manual testing checklist

- [ ] OTP email arrives (Resend/SMTP) and login works; wrong OTP blocked after 5 tries
- [ ] `POST /api/posts` without a token returns 401; with token returns 201
- [ ] Business reviews, circle create/join, channel create, and messages require login
- [ ] Creating a circle or channel **without a PIN returns 400** (PIN is required)
- [ ] Joining a PIN-protected circle requires the correct PIN
- [ ] `GET /api/businesses` and `GET /api/circles` work logged-out (public read)
- [ ] `/api/route` returns a route (uses `OSRM_BASE_URL` over HTTPS)
- [ ] All map data stays within Rewari bounds (28.0–28.3 lat, 76.4–76.8 lng)
- [ ] Offline: app loads cached feed/businesses; messages queue in IndexedDB

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| OTP never arrives | Check provider config; in `console` mode read the backend terminal |
| 401 on everything | JWT_SECRET changed (old tokens invalid) — log in again |
| Circles/channels created without PIN | You're on an old build — deploy the current one |
| DB resets on Render | Add a persistent disk and point `DATABASE_PATH` at it |
| CORS errors | Add the frontend origin to `CORS_ORIGIN` and redeploy |
| API returns `ERR_MODULE_NOT_FOUND` | Rebuild backend (`npm run build`) — dist is CommonJS |
| Route/navigation fails | Ensure `OSRM_BASE_URL` is HTTPS and reachable from the server |
