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
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This is required to handle client-side routing on Vercel. Because the Root Directory is set to `frontend`, this file will be correctly picked up by Vercel.
