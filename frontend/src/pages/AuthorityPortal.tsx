import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { postsApi } from '@/services/api'
import { Navigate } from 'react-router-dom'

export default function AuthorityPortal() {
  const user = useAuthStore((s) => s.user)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user?.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // For MVP, we use the regular post endpoint, but with the admin account
      // to serve as a verified announcement.
      await postsApi.create(`🚨 VERIFIED ANNOUNCEMENT: ${content}`)
      setContent('')
      alert('Announcement posted successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold text-red-700">Civic Authority Portal</h1>
      <p className="text-sm text-slate-500 mb-6">Verified City Administration Dashboard</p>

      <div className="card border-l-4 border-red-600">
        <h3 className="text-md font-bold mb-3">Broadcast Emergency or Civic Alert</h3>
        <p className="text-xs text-slate-500 mb-4">Post a verified announcement to the local neighborhood feed. It will be highlighted as a civic alert.</p>

        <form onSubmit={handlePost} className="space-y-3">
          <textarea
            className="input min-h-[100px] resize-none"
            placeholder="E.g., Road repair work on Highway 9 starting tomorrow. Plan commute accordingly."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={450}
            required
          />
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full bg-red-600 hover:bg-red-700">
            {loading ? 'Broadcasting...' : 'Broadcast Alert'}
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="card text-center py-6">
          <p className="text-3xl font-extrabold text-slate-800">45</p>
          <p className="text-xs font-semibold uppercase text-slate-500 mt-2">Active Alerts</p>
        </div>
        <div className="card text-center py-6">
          <p className="text-3xl font-extrabold text-slate-800">1.2K</p>
          <p className="text-xs font-semibold uppercase text-slate-500 mt-2">Citizens Reached</p>
        </div>
      </div>
    </div>
  )
}
