import { z } from 'zod'
import type { Request, Response } from 'express'
import { transientStore } from '../utils/transientStore'
import { userRepository } from '../database/repositories/userRepository'
import { asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { requireUserId } from '../middleware/auth'
import { getDatabase } from '../database/connection'
import { generateId } from '../database/repositories/base'

function parseUserAgent(ua: string) {
  let deviceType = 'Desktop'
  if (/mobile/i.test(ua)) deviceType = 'Mobile'
  else if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet'

  let os = 'Unknown OS'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Unknown Browser'
  if (/chrome/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua)) browser = 'Safari'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/edg/i.test(ua)) browser = 'Edge'
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer'

  return { deviceType, os, browser }
}

function logConnection(userId: string, lat: number, lng: number, req: Request) {
  try {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    const uaStr = req.headers['user-agent'] || ''
    const { deviceType, os, browser } = parseUserAgent(uaStr)
    const id = generateId()
    
    const db = getDatabase()
    const isPg = require('../database/connection').isPg
    
    const insertSql = `
      INSERT INTO user_connections (id, user_id, ip, user_agent, device_type, os, browser, lat, lng, connected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${isPg ? 'CURRENT_TIMESTAMP' : "datetime('now')"})
    `
    db.prepare(insertSql).run(id, userId, ip, uaStr, deviceType, os, browser, lat, lng)
  } catch (e) {
    console.error('Failed to log connection metadata:', e)
  }
}

const heartbeatSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const syncSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  localPosts: z.array(z.any()),
  localMessages: z.array(z.any()),
})

export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req)
  const user = userRepository.findById(userId)
  const { lat, lng } = parseBody(req, heartbeatSchema)

  // Update peer location in database and transient store
  userRepository.update(userId, {
    last_seen_at: new Date(),
    last_lat: lat,
    last_lng: lng
  })
  transientStore.updatePeer(userId, user?.name || 'Guest Neighbor', lat, lng)
  logConnection(userId, lat, lng, req)

  // Retrieve nearby peers
  const peers = transientStore.getNearbyPeers(lat, lng, 5) // 5km radius
  
  res.json({ peers })
})

export const syncPeers = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, localPosts, localMessages } = parseBody(req, syncSchema)
  const userId = requireUserId(req)

  // Update peer location in database and transient store
  userRepository.update(userId, {
    last_seen_at: new Date(),
    last_lat: lat,
    last_lng: lng
  })
  const user = userRepository.findById(userId)
  transientStore.updatePeer(userId, user?.name || 'Guest Neighbor', lat, lng)
  logConnection(userId, lat, lng, req)

  // 1. Merge incoming posts and messages into transientStore
  for (const post of localPosts) {
    if (post && post.id) {
      // check if post exists in cache
      const exists = transientStore.getPosts().some(p => p.id === post.id)
      if (!exists) {
        transientStore.addPost({
          id: post.id,
          user_id: post.userId || post.user_id || userId,
          author_name: post.authorName || post.author_name || 'Neighbor',
          content: post.content,
          image_url: post.imageUrl || post.image_url || null,
          location_lat: post.locationLat || post.location_lat || lat,
          location_lng: post.locationLng || post.location_lng || lng
        })
      }
    }
  }

  for (const msg of localMessages) {
    if (msg && msg.id && msg.channelId) {
      const exists = transientStore.getMessages(msg.channelId).some(m => m.id === msg.id)
      if (!exists) {
        transientStore.addMessage({
          id: msg.id,
          channel_id: msg.channelId,
          user_id: msg.userId || msg.user_id || userId,
          author_name: msg.authorName || msg.author_name || 'Neighbor',
          content: msg.content,
          type: msg.type || 'text',
          paste_id: msg.pasteId || msg.paste_id || null,
          expires_at: msg.expiresAt || msg.expires_at || null
        })
      }
    }
  }

  // 2. Fetch the latest transient posts and messages for the user's location
  const transientPosts = transientStore.getPosts(lat, lng, 5) // 5km radius
  
  // Return transient data to sync back to client
  res.json({
    posts: transientPosts,
    ok: true
  })
})
