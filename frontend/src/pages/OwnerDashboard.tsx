import { useEffect, useState } from 'react'
import { businessesApi, postsApi } from '@/services/api'
import type { Business } from '@/types'
import { Spinner, ErrorBox } from '@/components/UI'

export default function OwnerDashboard() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [postLoading, setPostLoading] = useState(false)

  useEffect(() => {
    businessesApi.list({ owner: 'me' })
      .then(res => {
        if (res.businesses.length > 0) {
          setBusiness(res.businesses[0])
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch business data'))
      .finally(() => setLoading(false))
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setPostLoading(true)
    try {
      await postsApi.create(content)
      setContent('')
      alert('Update posted successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post update')
    } finally {
      setPostLoading(false)
    }
  }

  if (loading) return <div className="px-4 pt-4"><Spinner /></div>
  if (error) return <div className="px-4 pt-4"><ErrorBox message={error} /></div>

  if (!business) {
    return (
      <div className="px-4 pt-4 text-center">
        <h1 className="text-xl font-bold">Owner Dashboard</h1>
        <p className="mt-4 text-slate-500">You don't have any claimed businesses yet.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold">Owner Dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your business profile.</p>

      <div className="card mb-6 bg-gradient-to-br from-indigo-50 to-white">
        <h2 className="text-lg font-bold text-slate-900">{business.name}</h2>
        <p className="text-sm text-slate-600 mb-4">{business.address}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white p-4 shadow-sm border border-indigo-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Total Profile Views</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">1,240</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border border-indigo-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Recent Searches</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">312</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-md font-bold mb-3">Post an Update</h3>
        <p className="text-xs text-slate-500 mb-4">Share announcements, offers, or news with the neighborhood feed.</p>

        <form onSubmit={handlePost} className="space-y-3">
          <textarea
            className="input min-h-[100px] resize-none"
            placeholder="What's new with your business?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            required
          />
          <button type="submit" disabled={postLoading} className="btn-primary w-full">
            {postLoading ? 'Posting...' : 'Post to Feed'}
          </button>
        </form>
      </div>
    </div>
  )
}
