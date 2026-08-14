import { z } from 'zod'
import type { Request, Response } from 'express'
import { transientStore } from '../utils/transientStore'
import { userRepository } from '../database/repositories/userRepository'
import { asyncHandler } from '../utils/errors'
import { parseBody } from '../utils/validate'
import { requireUserId } from '../middleware/auth'

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

  // Update peer location in memory
  transientStore.updatePeer(userId, user?.name || 'Guest Neighbor', lat, lng)

  // Retrieve nearby peers
  const peers = transientStore.getNearbyPeers(lat, lng, 5) // 5km radius
  
  res.json({ peers })
})

export const syncPeers = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, localPosts, localMessages } = parseBody(req, syncSchema)
  const userId = requireUserId(req)

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
