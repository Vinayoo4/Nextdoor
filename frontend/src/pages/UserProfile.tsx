import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usersApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'
import { timeAgo } from '@/utils/format'
import type { UserProfile as UserProfileData } from '@/types'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Super Admin',
  owner: 'Verified Owner',
  user: 'Neighbor',
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const currentUser = useAuthStore((s) => s.user)

  const [data, setData] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    usersApi
      .getProfile(id)
      .then((res) => setData(res))
      .catch((err: any) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner label="Loading neighborhood profile…" />
  if (error) return <ErrorBox message={error} />

  if (!data) return <EmptyState emoji="👤" title="Profile not found" />

  const isAdmin = currentUser?.role === 'admin'
  const masked = data.masked && !data.isSelf

  return (
    <div className="px-4 pt-4 space-y-4">
      <Link to="/home" className="text-xs font-semibold text-slate-500 hover:text-primary">
        ← Back
      </Link>

      {/* Header card */}
      <div className="card p-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-extrabold text-primary">
          {data.user.name[0]?.toUpperCase() || 'U'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-slate-800 truncate">{data.user.name}</h1>
            {data.isSelf && (
              <span className="bg-indigo-50 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">You</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {ROLE_LABEL[data.user.role] || data.user.role} · ⭐ {data.user.points} points
          </p>
          <p className="text-[10px] text-slate-400">
            {data.user.email} · Joined {data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-sm font-extrabold text-slate-700">{data.stats.posts}</span>
          <span className="text-[9px] font-bold uppercase text-slate-400">Posts</span>
          <span className="text-sm font-extrabold text-slate-700">{data.stats.messages}</span>
          <span className="text-[9px] font-bold uppercase text-slate-400">Chats</span>
        </div>
      </div>

      {/* Privacy notice */}
      {masked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
          🔒 <strong>Private profile.</strong> As a regular user you can only see this neighbor's summary. Their
          timeline posts and chat messages are hidden (<code>xxxx</code>). Only a City Super Admin can view the full
          timeline and complete chat history of any user.
        </div>
      )}
      {isAdmin && !data.isSelf && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 leading-relaxed">
          🛡️ <strong>Super Admin view.</strong> You are authorized to read this user's full timeline and complete
          chat history below.
        </div>
      )}

      {/* Timeline (posts) */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-700 mb-2">📜 Activity Timeline</h2>
        {data.timeline.length === 0 ? (
          <p className="text-xs text-slate-400 bg-white border rounded-xl p-4 text-center">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {data.timeline.map((post) => (
              <article key={post.id} className="card p-3">
                <p className={`text-sm leading-relaxed ${masked ? 'text-slate-400 italic select-none' : 'text-slate-700'}`}>
                  {masked ? `${post.content} ${post.content} ${post.content}` : post.content}
                </p>
                <p className="mt-1.5 text-right text-[10px] text-slate-400">
                  {post.createdAt ? timeAgo(post.createdAt) : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Chats */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-700 mb-2">💬 Chat History</h2>
        {data.chats.length === 0 ? (
          <p className="text-xs text-slate-400 bg-white border rounded-xl p-4 text-center">No chat messages yet.</p>
        ) : (
          <div className="space-y-2">
            {data.chats.map((msg) => (
              <div key={msg.id} className="card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-primary uppercase">
                    #{msg.channelName || 'Deleted channel'}
                    {msg.circleName ? ` · ${msg.circleName}` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {msg.createdAt ? timeAgo(msg.createdAt) : ''}
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    masked ? 'text-slate-400 italic select-none' : 'text-slate-700'
                  }`}
                >
                  {masked ? 'secret · secret · secret' : msg.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
