<<<<<<< Updated upstream
# Vercel Deployment Checklist

This document details the configuration required to correctly deploy the SaltedHash frontend to Vercel.

## 1. Project Root Directory
You MUST set the Vercel Root Directory to `frontend`.
- Navigate to your Vercel Dashboard -> Select Project -> **Settings** -> **General** -> **Root Directory**.
- Set it to `frontend` and save.

## 2. Build & Development Settings
The framework preset should be identified as **Vite** or **Vue**.js.
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## 3. Environment Variables
Add all required Appwrite environment variables in the Vercel settings (Settings -> Environment Variables).
- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_APPWRITE_DATABASE_ID`
- `VITE_APPWRITE_POSTS_COLLECTION_ID`
- `VITE_APPWRITE_COMMENTS_COLLECTION_ID`
- `VITE_APPWRITE_BUSINESSES_COLLECTION_ID`
- `VITE_APPWRITE_CIRCLES_COLLECTION_ID`
- `VITE_APPWRITE_CHANNELS_COLLECTION_ID`
- `VITE_APPWRITE_MESSAGES_COLLECTION_ID`
- `VITE_APPWRITE_BUCKET_ID`

## 4. Routing and SPA behavior
The repository contains `frontend/vercel.json` with the following contents:
=======
# Vercel Deployment — SALTEDHASH

## Project Settings

In the Vercel dashboard for this repository:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> `vercel.json` lives at `frontend/vercel.json` (not repo root). It contains SPA rewrite rules so Vue Router handles client-side routes.

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** for Production, Preview, and Development:

| Variable | Description |
|----------|-------------|
| `VITE_APPWRITE_ENDPOINT` | Appwrite API endpoint (e.g. `https://fra.cloud.appwrite.io/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Database ID containing all collections |
| `VITE_APPWRITE_POSTS_COLLECTION_ID` | Posts collection ID |
| `VITE_APPWRITE_COMMENTS_COLLECTION_ID` | Comments collection ID |
| `VITE_APPWRITE_BUSINESSES_COLLECTION_ID` | Businesses collection ID |
| `VITE_APPWRITE_CIRCLES_COLLECTION_ID` | Circles collection ID |
| `VITE_APPWRITE_CHANNELS_COLLECTION_ID` | Channels collection ID |
| `VITE_APPWRITE_MESSAGES_COLLECTION_ID` | Messages collection ID |
| `VITE_APPWRITE_BUCKET_ID` | Storage bucket ID for image uploads |

All variables must be prefixed with `VITE_` so Vite embeds them at build time.

## Pre-Deploy Checklist

1. Create Appwrite resources per [APPWRITE_SETUP.md](./APPWRITE_SETUP.md)
2. Add your Vercel domain to Appwrite Web Platforms
3. Enable Email/Password auth in Appwrite
4. Set all env vars in Vercel
5. Run `npm run build` locally to verify zero TypeScript errors

## SPA Routing

`frontend/vercel.json`:

>>>>>>> Stashed changes
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
<<<<<<< Updated upstream
This is required to handle client-side routing on Vercel. Because the Root Directory is set to `frontend`, this file will be correctly picked up by Vercel.
=======

This ensures `/businesses`, `/circles`, `/profile`, etc. resolve correctly on hard refresh.

## PWA Notes

- Service worker is generated at build time by `vite-plugin-pwa`
- Offline fallback: `/offline.html`
- Icons: `public/icons/icon-192x192.png`, `icon-512x512.png`

## Local Development

```bash
cd frontend
cp .env.example .env   # fill in values
npm install
npm run dev
```

Dev server: `http://localhost:5173`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Add Vercel hostname to Appwrite Platforms |
| Blank page after deploy | Verify Root Directory = `frontend` and Output = `dist` |
| 401 on all requests | Check `VITE_APPWRITE_PROJECT_ID` and auth session |
| Missing collections | Run setup per APPWRITE_SETUP.md |
| Images not loading | Verify bucket permissions and `VITE_APPWRITE_BUCKET_ID` |
>>>>>>> Stashed changes
