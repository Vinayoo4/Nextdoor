import { useEffect, useState } from 'react'
import { postsApi, nearbyApi } from '@/services/api'
import { localDb } from '@/services/localDb'
import { useAuthStore } from '@/stores/auth'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'
import UserLink from '@/components/UserLink'
import { timeAgo, REWARI_CENTER } from '@/utils/format'

export default function Feed() {
  const currentUser = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  // Geolocation & Nearby states
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(REWARI_CENTER)
  const [nearbyPeers, setNearbyPeers] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')

  // 1. Setup Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setCoords(REWARI_CENTER)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  // 2. Poll Nearby Peers (Heartbeat) every 4 seconds
  useEffect(() => {
    if (!token) return

    const sendHeartbeat = () => {
      nearbyApi
        .heartbeat(coords.lat, coords.lng)
        .then((res) => {
          // Filter out self from nearby peers
          const filtered = res.peers.filter((p: any) => p.userId !== currentUser?.id)
          setNearbyPeers(filtered)
        })
        .catch(() => {})
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 4000)
    return () => clearInterval(interval)
  }, [coords, token, currentUser])

  // 3. Load & Sync feed posts
  function loadFeed() {
    setLoading(true)
    // First read from local IndexedDB
    localDb.getPosts().then((localPosts) => {
      setPosts(localPosts)
      setLoading(false)
    })

    // Fetch location-aware transient posts from server
    postsApi
      .list({
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
        radius: '5', // 5km radius
      })
      .then(async (res) => {
        // Save fetched posts to local IndexedDB
        await localDb.savePosts(res.posts)
        // Load combined list
        const combined = await localDb.getPosts()
        setPosts(combined)
        setError('')
      })
      .catch((err) => {
        // Keep showing local posts if fetch fails (e.g. offline)
        console.log('API Feed fetch failed (offline mode):', err.message)
      })
  }

  useEffect(loadFeed, [coords])

  async function handleDeletePost(postId: string) {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    try {
      try {
        await postsApi.delete(postId)
      } catch (apiErr) {
        console.warn('API post deletion warning:', apiErr)
      }
      await localDb.deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete post')
    }
  }

  // 4. Submit post
  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    setPostError('')

    const postPayload = {
      id: Math.random().toString(),
      user_id: currentUser?.id || '000000000000000000000000',
      author_name: currentUser?.name || 'Guest User',
      content: content.trim(),
      image_url: null,
      location_lat: coords.lat,
      location_lng: coords.lng,
      created_at: new Date().toISOString()
    }

    try {
      // Save locally first
      await localDb.savePost(postPayload)
      setPosts((p) => [postPayload, ...p])

      let serverPost: any = null
      // Push transiently to server
      if (token) {
        const res = await postsApi.create(content.trim(), coords.lat, coords.lng)
        serverPost = res.post
      }

      // Delete local temporary post and store server post instead
      await localDb.deletePost(postPayload.id)
      if (serverPost) {
        await localDb.savePost(serverPost)
      } else {
        await localDb.savePost(postPayload)
      }

      setContent('')
      loadFeed()
    } catch (err) {
      // Keep it saved locally even if server post fails
      setContent('')
      setPostError('Post saved locally. Will sync when online.')
    } finally {
      setPosting(false)
    }
  }

  // 5. Trigger P2P-like Local Sync with Nearby Neighbors
  async function handlePeerSync() {
    if (!token) return
    setSyncing(true)
    setSyncStatus('Gathering local data to sync...')
    try {
      // Gather local posts
      const myLocalPosts = await localDb.getPosts()
      // Gather local messages
      const myLocalMessages: any[] = []
      
      setSyncStatus('Exchanging packages with nearby devices...')
      const res = await nearbyApi.sync(coords.lat, coords.lng, myLocalPosts, myLocalMessages)
      
      // Save returned posts to local IndexedDB
      if (res.posts && res.posts.length > 0) {
        await localDb.savePosts(res.posts)
      }
      
      const merged = await localDb.getPosts()
      setPosts(merged)
      setSyncStatus('Sync complete! Feed updated.')
      setTimeout(() => setSyncStatus(''), 3000)
    } catch (err) {
      setSyncStatus('Sync failed (offline)')
      setTimeout(() => setSyncStatus(''), 3000)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold">Community Feed</h1>
          <p className="mt-0.5 text-sm text-slate-500">What’s happening near you (Rewari Area)</p>
        </div>
        {token && (
          <button
            onClick={handlePeerSync}
            disabled={syncing}
            className="btn btn-outline btn-sm text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 border-primary text-primary"
          >
            {syncing ? '🔄 Syncing...' : '🔄 Sync Nearby Feed'}
          </button>
        )}
      </div>

      {syncStatus && (
        <p className="mt-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded-lg font-semibold">{syncStatus}</p>
      )}

      {/* Nearby Active Users Bar */}
      {token && nearbyPeers.length > 0 && (
        <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nearby Neighbors Active Online ({nearbyPeers.length})</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {nearbyPeers.map((peer) => (
              <div key={peer.userId} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border text-xs shrink-0">
                <span className="h-4 w-4 bg-green-500 rounded-full inline-block animate-pulse"></span>
                <UserLink userId={peer.userId} name={peer.name} className="font-semibold text-slate-800" />
                <button
                  onClick={handlePeerSync}
                  className="text-[10px] text-primary font-bold ml-1 hover:underline"
                >
                  ⚡ Sync
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handlePost} className="card mt-4 space-y-2">
        <textarea
          className="input min-h-24 resize-none"
          placeholder="Share something with your neighbors…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
        />
        {postError && <p className="text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded">{postError}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={posting || !content.trim()} className="btn-primary">
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={loadFeed} />
      ) : posts.length === 0 ? (
        <EmptyState emoji="💬" title="No posts yet" hint="Be the first to share neighborhood news." />
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((p) => (
            <article key={p.id} className="card relative group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-primary">
                    {p.author_name ? p.author_name[0]?.toUpperCase() : p.authorName?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      <UserLink userId={p.user_id || p.userId} name={p.author_name || p.authorName} />
                    </p>
                    <p className="text-xs text-slate-400">{timeAgo(p.created_at || p.createdAt)}</p>
                  </div>
                </div>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => handleDeletePost(p.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    🗑️ Delete Post
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.content}</p>
              {currentUser?.role === 'admin' && p.senderConnection && (
                <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] font-mono text-indigo-700 leading-tight space-y-0.5">
                  <div className="flex flex-wrap gap-x-2">
                    <span>🔌 IP: {p.senderConnection.ip}</span>
                    <span>🖥️ {p.senderConnection.deviceType} ({p.senderConnection.os} / {p.senderConnection.browser})</span>
                  </div>
                  {p.senderConnection.lat !== null && p.senderConnection.lng !== null && (
                    <div className="font-semibold text-emerald-600">
                      📍 Coords: [{p.senderConnection.lat.toFixed(5)}, {p.senderConnection.lng.toFixed(5)}]
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
