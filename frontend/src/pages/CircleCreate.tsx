import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { circlesApi } from '@/services/api'

export default function CircleCreate() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [initialChannel, setInitialChannel] = useState('General')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await circlesApi.create({
        name: name.trim(),
        description: description.trim(),
        initialChannel: initialChannel.trim() || undefined,
      })
      navigate(`/circles/${res.circle.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create circle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl">Create a Circle</h1>
      <p className="mt-0.5 text-sm text-slate-500">Start a group for your neighborhood or interest</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Circle Name *</label>
            <input
              className="input"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vaishali Nagar Residents"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Description</label>
            <textarea
              className="input min-h-20 resize-none"
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this circle about?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">First Channel</label>
            <input
              className="input"
              maxLength={60}
              value={initialChannel}
              onChange={(e) => setInitialChannel(e.target.value)}
              placeholder="e.g. General"
            />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create Circle'}
        </button>
      </form>
    </div>
  )
}
