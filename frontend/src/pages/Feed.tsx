import { useEffect, useState } from 'react'
import type { Post } from '@/types'
import { postsApi } from '@/services/api'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'
import { timeAgo } from '@/utils/format'

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  function load() {
    setLoading(true)
    postsApi
      .list({ limit: '30' })
      .then((res) => {
        setPosts(res.posts)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load feed'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    setPostError('')
    try {
      await postsApi.create(content.trim())
      setContent('')
      load()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl">Community Feed</h1>
      <p className="mt-0.5 text-sm text-slate-500">What’s happening in your neighborhood</p>

      <form onSubmit={handlePost} className="card mt-4 space-y-2">
        <textarea
          className="input min-h-24 resize-none"
          placeholder="Share something with your neighbors…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
        />
        {postError && <p className="text-sm font-medium text-red-600">{postError}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={posting || !content.trim()} className="btn-primary">
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : posts.length === 0 ? (
        <EmptyState emoji="💬" title="No posts yet" hint="Be the first to share neighborhood news." />
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((p) => (
            <article key={p.id} className="card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-primary">
                  {p.authorName[0]?.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.authorName}</p>
                  <p className="text-xs text-slate-400">{timeAgo(p.createdAt)}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
