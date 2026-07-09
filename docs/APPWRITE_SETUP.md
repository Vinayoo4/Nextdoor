# Appwrite Backend Setup — SALTEDHASH

This document is derived from **actual frontend code usage** in `frontend/src/`. Configure your Appwrite project to match exactly.

## Prerequisites

- Appwrite Cloud or self-hosted instance
- Email/Password auth enabled
- Web platform entries for `http://localhost:5173` and your Vercel domain

## Environment Variables

See `frontend/.env.example` for all `VITE_APPWRITE_*` variables.

## Database

| Setting | Value |
|---------|-------|
| Database ID | Set via `VITE_APPWRITE_DATABASE_ID` |
| Name | `saltedhash` (recommended) |

## Collections

### 1. `posts` (`VITE_APPWRITE_POSTS_COLLECTION_ID`)

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `content` | String | 500 | Yes | — |
| `userId` | String | 36 | Yes | — |
| `authorName` | String | 128 | Yes | — |
| `imageId` | String | 36 | No | — |

**Indexes:**
- `created_desc` — Key: `$createdAt`, Order: DESC (for feed pagination)
- `user_idx` — Key: `userId`, Order: ASC (optional, for user posts)

### 2. `comments` (`VITE_APPWRITE_COMMENTS_COLLECTION_ID`)

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `content` | String | 500 | Yes | — |
| `postId` | String | 36 | Yes | — |
| `userId` | String | 36 | Yes | — |
| `authorName` | String | 128 | Yes | — |

**Indexes:**
- `post_idx` — Key: `postId`, Order: ASC
- `post_created` — Keys: `postId` ASC, `$createdAt` ASC

### 3. `businesses` (`VITE_APPWRITE_BUSINESSES_COLLECTION_ID`)

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `name` | String | 128 | Yes | — |
| `category` | String | 64 | Yes | — |
| `shortDescription` | String | 256 | Yes | — |
| `description` | String | 2000 | No | — |
| `phone` | String | 32 | No | — |
| `email` | String | 128 | No | — |
| `imageId` | String | 36 | No | — |

**Indexes:**
- `created_desc` — Key: `$createdAt`, Order: DESC

### 4. `circles` (`VITE_APPWRITE_CIRCLES_COLLECTION_ID`)

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `name` | String | 128 | Yes | — |
| `description` | String | 512 | Yes | — |

### 5. `channels` (`VITE_APPWRITE_CHANNELS_COLLECTION_ID`)

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `name` | String | 128 | Yes | — |
| `circleId` | String | 36 | Yes | — |

**Indexes:**
- `circle_idx` — Key: `circleId`, Order: ASC
- `circle_created` — Keys: `circleId` ASC, `$createdAt` DESC

### 6. `messages` (`VITE_APPWRITE_MESSAGES_COLLECTION_ID`)

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `content` | String | 1000 | Yes | — |
| `channelId` | String | 36 | Yes | — |
| `userId` | String | 36 | Yes | — |
| `authorName` | String | 128 | Yes | — |

**Indexes:**
- `channel_idx` — Key: `channelId`, Order: ASC
- `channel_created` — Keys: `channelId` ASC, `$createdAt` ASC

## Permissions Model

Apply to **all 6 collections**:

| Role | Read | Create | Update | Delete |
|------|------|--------|--------|--------|
| `Role.users()` | Yes | Yes | No | No |
| `Role.user("[USER_ID]")` on create | — | Document gets owner | Yes (own) | Yes (own) |

**Recommended document permissions on create** (set in Console or via API):

```
Read:   Permission.read(Role.users())
Create: Permission.write(Role.users())
Update: Permission.update(Role.user(userId))
Delete: Permission.delete(Role.user(userId))
```

Where `userId` is the authenticated user's `$id` passed as document attribute.

For **businesses** (admin-curated listings), use:
- Read: `Role.users()`
- Create/Update/Delete: `Role.team("admins")` or specific admin users

> The frontend allows any authenticated user to upload a business photo via `updateDocument`. Ensure your businesses collection update permissions match your intended model.

## Storage Bucket

| Setting | Value |
|---------|-------|
| Bucket ID | `VITE_APPWRITE_BUCKET_ID` |
| Name | `saltedhash-media` (recommended) |
| Max file size | 5 MB |
| Allowed extensions | `jpg`, `jpeg`, `png`, `gif`, `webp` |

**Permissions:**
- Read: `Role.users()` (or `Role.any()` for public image previews)
- Create: `Role.users()`
- Update/Delete: `Role.user("[USER_ID]")` on uploaded files

Used for:
- Post image attachments (`posts.imageId`)
- Business photos (`businesses.imageId`)

## Auth

- **Provider:** Email/Password — must be enabled
- **Recovery URL:** Add your Vercel domain + `/login` to allowed redirect URLs

## Platforms (Web App)

Add these in Appwrite Console → Settings → Platforms:

| Name | Hostname |
|------|----------|
| Local dev | `localhost` |
| Vercel production | `your-app.vercel.app` |
| Vercel preview | `*.vercel.app` (if supported) or each preview domain |

## Realtime

Enable Realtime for the `messages` collection so live chat works without polling fallback.

## Automated Setup

Run the optional setup script (requires API key with scopes: `databases.write`, `collections.write`, `attributes.write`, `indexes.write`, `buckets.write`):

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
APPWRITE_PROJECT_ID=your_project_id \
APPWRITE_API_KEY=your_api_key \
APPWRITE_DATABASE_ID=your_database_id \
node scripts/appwrite-setup.js
```

**Do not run against production without review.** The script is idempotent where possible but will create resources if missing.
