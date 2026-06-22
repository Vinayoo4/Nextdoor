# SALTEDHASH / Nextdoor — Code Audit Report
**Date:** June 21, 2026 | **Auditor:** AI Expert Review

## Summary
All critical production-blocking bugs have been fixed in this commit. See below for full details.

## Fixes Applied in This Commit

### ✅ FIX-1: offlineCache.ts — Corrected DBSchema types
- `PostDraft` and `CachedPost` interfaces now use `$id`, `$createdAt`, `userId`, `authorName` to match actual Appwrite document structure and `Home.vue` usage.
- `cachePosts()` now uses `Promise.all()` for proper async transaction handling.

### ✅ FIX-2: appwrite.ts — Removed dangerous hardcoded collection ID fallbacks
- All collection IDs now read exclusively from env vars (`VITE_APPWRITE_*_COLLECTION_ID`).
- Added startup validation that logs an error for each missing required env var.
- Endpoint and Project ID retain safe fallbacks (these are non-sensitive project identifiers).

### ✅ FIX-3: vercel.json — Added SPA rewrite rules
- All routes now redirect to `/index.html` so Vue Router handles them.
- Without this, direct navigation to `/businesses`, `/circles`, etc. would return 404 on Vercel.

### ✅ FIX-4: public/offline.html — Added PWA offline fallback
- Workbox `navigateFallback: '/offline.html'` now has a matching static file.
- Shows friendly offline message with retry button.

### ✅ FIX-5: Login.vue — Added client-side input validation
- Email, password (min 8 chars), and name (on register) are validated before API calls.
- Error messages are user-friendly.

## Remaining Action Items (Manual)

### 🔴 Critical — Must do before deployment
1. **Create Appwrite Collections** with these exact fields:
   - `posts`: `content` (string), `userId` (string), `authorName` (string)
   - `comments`: `content` (string), `postId` (string), `userId` (string), `authorName` (string)
   - `businesses`: `name` (string), `category` (string), `shortDescription` (string)
   - `circles`: `name` (string), `description` (string)
   - `channels`: `name` (string), `circleId` (string)
   - `messages`: `content` (string), `channelId` (string), `userId` (string), `authorName` (string)

2. **Set Vercel Environment Variables:**
   ```
   VITE_APPWRITE_DATABASE_ID=<your-db-id>
   VITE_APPWRITE_POSTS_COLLECTION_ID=<id>
   VITE_APPWRITE_COMMENTS_COLLECTION_ID=<id>
   VITE_APPWRITE_BUSINESSES_COLLECTION_ID=<id>
   VITE_APPWRITE_CIRCLES_COLLECTION_ID=<id>
   VITE_APPWRITE_CHANNELS_COLLECTION_ID=<id>
   VITE_APPWRITE_MESSAGES_COLLECTION_ID=<id>
   VITE_APPWRITE_BUCKET_ID=<id>
   ```

3. **Add Vercel domain to Appwrite Platforms** (Appwrite Console → Settings → Platforms → Add Web):
   - Add your `*.vercel.app` URL to prevent CORS errors.

4. **Enable Email/Password Auth** in Appwrite Console → Auth → Email/Password.

### 🟡 High Priority
5. Add PWA icons: `frontend/public/icons/icon-192x192.png` and `icon-512x512.png`
6. Add Business Detail page (`/businesses/:id`) with a real route and data fetch

### Vercel Build Settings
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
