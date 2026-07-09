# Production Audit — SALTEDHASH

## Completed Items

### Routing & App Shell
- **App.vue**: Auth boot loading screen (`!authStore.isInitialized`), `Transition` with fade `mode="out-in"` wrapping `<RouterView>`, iOS safe-area-inset-bottom padding on bottom nav, `exactActiveClass` replaced with `$route.path` direct comparison for active nav state
- **router/index.ts**: All routes defined (Home, Login, Businesses, BusinessDetail, Circles, Profile, Offline, NotFound), no duplicates, `RouteMeta` module augmentation in `meta.d.ts`
- **index.html**: Correct title ("SALTEDHASH — Your Neighborhood"), meta description, theme-color, apple-mobile-web-app-capable, apple-touch-icon

### Feed (Home.vue)
- Fixed `v-if`/`v-if` bug — second condition is now `v-else` so states never overlap
- Null-safe access on all `authStore.user` usage (optional chaining + `??` fallbacks)
- `maxlength="500"` on textarea + live character counter
- Cursor-based pagination with `Query.cursorAfter` + "Load more" button
- Delete own post (visible only for `post.userId === authStore.user?.$id`), removes from local state
- No auto-sync-on-load loop — `syncDrafts()` only runs after successful `createPost`
- Date formatting via `en-IN` locale (`formatDateTime`, `formatDate`, `formatTime`)
- All `any` types replaced with `Post`, `Comment`, `PostDraft` from `types/appwrite.ts`

### Businesses
- "View Details" wired to `router.push(\`/businesses/${biz.$id}\`)`
- **BusinessDetail.vue**: Full implementation with loading skeleton, 404 not-found state (catches Appwrite 404), full detail view (name, category badge, description, contact info), image upload via `storage.createFile`
- `Query.orderDesc('$createdAt')` on list fetch
- Search input with client-side computed filter (name + category)
- Empty state with icon and "No businesses listed yet" message

### Circles / Channels / Messages
- **Appwrite Realtime** implemented for messages: subscribes to `databases.{db}.collections.{messages}.documents`, filters by channelId, appends on `create` events. Falls back to **5-second polling** if Realtime is unavailable.
- Auto-scroll message list to bottom on new message arrival
- Message input trimmed before send; empty/whitespace blocked
- `channels.value = []` cleared immediately when switching circles (before new fetch resolves)
- Channel cache per circleId in memory (`channelCache` Map) — reselecting a previously-viewed circle skips refetch
- All `any` types replaced with `Circle`, `Channel`, `Message`

### Auth & Account
- **stores/auth.ts**: `user` typed as `Models.User<Models.Preferences> | null`; `login()`, `register()`, `requestPasswordRecovery()`, `updateName()`, `updatePassword()`, `deleteAccount()` + `logout()` all in the store
- **Login.vue**: Calls `authStore.login()`/`authStore.register()` only; password visibility toggle; "Forgot Password?" via `account.createRecovery()`; error codes mapped to human messages (401, 409, 429)
- **Profile.vue**: Displays user email, edit name via `account.updateName()`, change password via `account.updatePassword()`, danger zone requires typing "DELETE", all feedback inline
- **Note**: `deleteAccount()` uses `account.deleteSessions()` (logout from all devices) since Appwrite v26 client SDK does not expose account deletion — full account deletion requires server SDK or Appwrite Admin API

### PWA & Offline
- Icons verified: `/public/icons/icon-192x192.png`, `icon-512x512.png`, `favicon.svg` all exist
- **vite.config.ts**: `devOptions.enabled: false`, `navigateFallbackDenylist: [/^\/api\//]`, manifest has description, `orientation: "portrait"`, maskable icon entry
- **Offline.vue**: Inline "Still offline" message with 3-second auto-dismiss, `window` `'online'` event listener auto-navigates to `/`, no `alert()`
- **offlineCache.ts**: `MAX_CACHED_POSTS = 100`, prunes oldest on write; `syncStatus` field (`'pending' | 'syncing' | 'failed'`) drives retry UI

### File/Image Uploads (Part 8)
- Post creation: image attachment via `storage.createFile()`, file validation (max 5 MB, image/* only), preview before upload, loading state, error handling
- Business photo: same pattern in `BusinessDetail.vue`, updates `businesses.imageId` via `databases.updateDocument`

### Appwrite Backend Formalization (Part 7)
- **docs/APPWRITE_SETUP.md**: Complete documentation of all 6 collections (posts, comments, businesses, circles, channels, messages) with attribute types/sizes, indexes, permission model, storage bucket requirements, auth provider, platform entries
- **scripts/appwrite-setup.js**: Full `node-appwrite` automation script using server SDK, creates all collections, attributes, indexes, and storage bucket programmatically
- **frontend/.env.example**: Lists all required `VITE_APPWRITE_*` variables with placeholder values and comments

### Testing (Part 9)
- Playwright already configured in `playwright.config.ts`
- Three test specs in `frontend/e2e/`: `auth.spec.ts`, `feed.spec.ts`, `businesses.spec.ts`
- Tests use condition-based waits (`waitForResponse`, `waitForSelector`) — no arbitrary timeouts
- Tests adapted for updated UI elements (textarea placeholder text, new empty state text)

### Deployment Docs (Part 10)
- **docs/VERCEL_DEPLOYMENT.md**: Root Directory = `frontend`, build/output/install commands, all env vars, SPA rewrite rules, PWA notes

### Type Safety
- `services/models.ts` kept for backward compatibility (all `Model` suffix interfaces)
- `types/appwrite.ts` is the primary type source: `Post`, `Comment`, `Business`, `Circle`, `Channel`, `Message`, `PostDraft`, `CachedPost`, `SyncStatus`
- No `any` types remain in any touched file

### Build Verification
- `vue-tsc -b`: **zero errors**
- `vite build`: **zero errors**, all chunks built (61 modules, 2.19s)

## Intentionally Deferred

| Item | Reason |
|------|--------|
| Full account deletion (server-side) | Appwrite v26 client SDK does not expose `Account.delete()`. Requires server SDK with admin API key or a Cloud Function. Current `deleteAccount()` calls `deleteSessions()` as the closest client-side equivalent. |
| Realtime for messages | Implemented with Appwrite `client.subscribe()`, with automatic polling fallback. This is production-ready. |
| E2E tests against live backend | Tests check UI states and redirects but do not test actual CRUD against Appwrite (requires seeded test project). The Playwright infrastructure is in place — add real credentials to run full workflow tests. |
| Web push notifications | Not currently supported by `vite-plugin-pwa` configuration; would require additional `workbox` configuration for push event handling |

## Risks

| Risk | Mitigation |
|------|------------|
| Vite 8 requires Node.js 20.19+ or 22.12+ | Vercel defaults to latest LTS (22.x) — safe in production. Warning shown on older local Node.js versions. |
| `@rolldown/binding-win32-x64-msvc` may be missing on fresh install | Run `npm install` from repo root (monorepo hoists dependencies). The binding is an optional dependency of `rolldown`. |
| Offline draft data loss on IndexedDB clear | Visible alert in draft banner, user can manually re-post |
| Realtime channel subscription leaks on rapid toggle | `teardownSubscriptions()` called before each new subscription setup |
