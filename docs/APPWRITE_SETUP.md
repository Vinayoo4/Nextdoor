# Appwrite Setup Checklist

This document describes the required server configuration for the SaltedHash frontend to function correctly. You must create these in your Appwrite Console.

## Prerequisites
- Create an Appwrite Project and note its **Project ID**.
- Under **Settings -> Platforms -> Web App**, add your domains (e.g. `localhost`, `your-vercel-deployment.vercel.app`).

## Database
Create a new Database and note its **Database ID**.

## Collections & Attributes

### 1. Posts Collection (`VITE_APPWRITE_POSTS_COLLECTION_ID`)
- **Attributes:**
  - `content` (String, size: 5000, required: true)
  - `userId` (String, size: 36, required: true)
  - `authorName` (String, size: 100, required: true)
- **Permissions:**
  - Create: `users`
  - Read: `users`
  - Update: `users` (or limit to document owner using `Role.user(userId)` or Appwrite's document security)
  - Delete: `users` (or limit to document owner)

### 2. Comments Collection (`VITE_APPWRITE_COMMENTS_COLLECTION_ID`)
- **Attributes:**
  - `content` (String, size: 2000, required: true)
  - `postId` (String, size: 36, required: true)
  - `userId` (String, size: 36, required: true)
  - `authorName` (String, size: 100, required: true)
- **Permissions:**
  - Create: `users`
  - Read: `users`
  - Update: `users` (or limit to document owner)
  - Delete: `users` (or limit to document owner)
- **Indexes:**
  - `postId_idx` (Key, attributes: `[postId]`) - To quickly query comments for a post.

### 3. Businesses Collection (`VITE_APPWRITE_BUSINESSES_COLLECTION_ID`)
- **Attributes:**
  - `name` (String, size: 200, required: true)
  - `category` (String, size: 100, required: true)
  - `shortDescription` (String, size: 500, required: false)
- **Permissions:**
  - Create: `admin` (Or however businesses are provisioned)
  - Read: `users`
  - Update: `admin`
  - Delete: `admin`

### 4. Circles Collection (`VITE_APPWRITE_CIRCLES_COLLECTION_ID`)
- **Attributes:**
  - `name` (String, size: 200, required: true)
  - `description` (String, size: 1000, required: false)
- **Permissions:**
  - Create: `admin` or `users`
  - Read: `users`
  - Update: `admin`
  - Delete: `admin`

### 5. Channels Collection (`VITE_APPWRITE_CHANNELS_COLLECTION_ID`)
- **Attributes:**
  - `name` (String, size: 200, required: true)
  - `circleId` (String, size: 36, required: true)
- **Permissions:**
  - Create: `admin`
  - Read: `users`
  - Update: `admin`
  - Delete: `admin`
- **Indexes:**
  - `circleId_idx` (Key, attributes: `[circleId]`) - To quickly query channels for a circle.

### 6. Messages Collection (`VITE_APPWRITE_MESSAGES_COLLECTION_ID`)
- **Attributes:**
  - `content` (String, size: 2000, required: true)
  - `channelId` (String, size: 36, required: true)
  - `userId` (String, size: 36, required: true)
  - `authorName` (String, size: 100, required: true)
- **Permissions:**
  - Create: `users`
  - Read: `users`
  - Update: `users` (or limit to document owner)
  - Delete: `users` (or limit to document owner)
- **Indexes:**
  - `channelId_idx` (Key, attributes: `[channelId]`) - To quickly query messages for a channel.

### Storage Bucket (`VITE_APPWRITE_BUCKET_ID`)
- Although a bucket ID is required by the environment variables, the current frontend code does not actively use it yet. Create one as a placeholder or remove the requirement in code.
