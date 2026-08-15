// Transient In-Memory Data Store
// Stores data in RAM instead of persisting to SQLite database.

export interface TransientMessage {
  id: string
  channel_id: string
  user_id: string
  author_name: string
  content: string
  type: 'text' | 'paste'
  paste_id: string | null
  created_at: string
  expires_at: string | null
}

export interface TransientPost {
  id: string
  user_id: string
  author_name: string
  content: string
  image_url: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
}

export interface TransientPaste {
  id: string
  owner_id: string
  channel_id: string | null
  society_id: string | null
  title: string | null
  content: string
  language: string | null
  filename: string | null
  visibility: 'public' | 'unlisted' | 'private' | 'channel'
  expires_at: string | null
  created_at: string
}

export interface ActivePeer {
  userId: string
  name: string
  lat: number
  lng: number
  lastSeen: number
}

// Memory caches
const messagesCache: Record<string, TransientMessage[]> = {}
const postsCache: TransientPost[] = []
const commentsCache: Record<string, any[]> = {}
const pastesCache: Record<string, TransientPaste> = {}
const activePeersCache: Record<string, ActivePeer> = {}

// Helper: Haversine distance
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const transientStore = {
  // Messages
  getMessages(channelId: string): TransientMessage[] {
    const list = messagesCache[channelId] || []
    // Filter out expired messages
    const now = new Date()
    return list.filter((m) => {
      if (!m.expires_at) return true
      return new Date(m.expires_at) > now
    })
  },

  addMessage(message: Omit<TransientMessage, 'created_at'>): TransientMessage {
    const fullMsg: TransientMessage = {
      ...message,
      created_at: new Date().toISOString()
    }
    if (!messagesCache[message.channel_id]) {
      messagesCache[message.channel_id] = []
    }
    messagesCache[message.channel_id].push(fullMsg)
    return fullMsg
  },

  deleteMessage(channelId: string, messageId: string): boolean {
    const list = messagesCache[channelId]
    if (!list) return false
    const idx = list.findIndex((m) => m.id === messageId)
    if (idx !== -1) {
      list.splice(idx, 1)
      return true
    }
    return false
  },

  // Posts
  getPosts(lat?: number, lng?: number, radiusKm: number = 5): TransientPost[] {
    if (lat !== undefined && lng !== undefined) {
      return postsCache.filter((p) => {
        if (p.location_lat === null || p.location_lng === null) return false
        return getDistanceKm(lat, lng, p.location_lat, p.location_lng) <= radiusKm
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return [...postsCache].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  addPost(post: Omit<TransientPost, 'created_at'>): TransientPost {
    const fullPost: TransientPost = {
      ...post,
      created_at: new Date().toISOString()
    }
    postsCache.unshift(fullPost)
    if (postsCache.length > 500) {
      postsCache.pop()
    }
    return fullPost
  },

  deletePost(postId: string): boolean {
    const idx = postsCache.findIndex((p) => p.id === postId)
    if (idx !== -1) {
      postsCache.splice(idx, 1)
      delete commentsCache[postId]
      return true
    }
    return false
  },

  // Comments
  getComments(postId: string): any[] {
    return commentsCache[postId] || []
  },

  addComment(postId: string, comment: any): any {
    if (!commentsCache[postId]) {
      commentsCache[postId] = []
    }
    const fullComment = {
      ...comment,
      created_at: new Date().toISOString()
    }
    commentsCache[postId].push(fullComment)
    return fullComment
  },

  // Pastes
  getPaste(id: string): TransientPaste | null {
    const p = pastesCache[id] || null
    if (!p) return null
    if (p.expires_at && new Date(p.expires_at) < new Date()) {
      delete pastesCache[id]
      return null
    }
    return p
  },

  addPaste(paste: Omit<TransientPaste, 'created_at'>): TransientPaste {
    const fullPaste: TransientPaste = {
      ...paste,
      created_at: new Date().toISOString()
    }
    pastesCache[paste.id] = fullPaste
    return fullPaste
  },

  // Peers Heartbeat
  updatePeer(userId: string, name: string, lat: number, lng: number): void {
    activePeersCache[userId] = {
      userId,
      name,
      lat,
      lng,
      lastSeen: Date.now()
    }
  },

  getNearbyPeers(lat: number, lng: number, radiusKm: number = 2): ActivePeer[] {
    const now = Date.now()
    const cutoff = now - 30 * 1000 // 30s heartbeat cutoff
    return Object.values(activePeersCache).filter((peer) => {
      if (peer.lastSeen < cutoff) return false
      return getDistanceKm(lat, lng, peer.lat, peer.lng) <= radiusKm
    })
  }
}
