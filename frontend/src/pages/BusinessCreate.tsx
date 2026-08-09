import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { businessesApi } from '@/services/api'
import { CATEGORIES } from '@/utils/categories'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function BusinessCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    category: 'Food',
    subcategory: '',
    description: '',
    address: '',
    phone: '',
    whatsapp: '',
    lat: '26.9124',
    lng: '75.7873',
    tags: '',
  })
  const [attrs, setAttrs] = useState({ parking: false, cards: false, homeDelivery: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await businessesApi.create({
        name: form.name.trim(),
        category: form.category,
        subcategory: form.subcategory.trim() || undefined,
        description: form.description.trim() || undefined,
        address: form.address.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12),
        attributes: attrs,
      })
      navigate(`/businesses/${res.business.slug}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl">Add a Business</h1>
      <p className="mt-0.5 text-sm text-slate-500">Help your neighbors discover your place</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Details</h2>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Business Name *</label>
            <input className="input" required maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sharma Sweets" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">Category *</label>
              <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">Subcategory</label>
              <input className="input" maxLength={40} value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Sweets & Snacks" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Description</label>
            <textarea className="input min-h-20 resize-none" maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Tell neighbors what makes this place special" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Tags (comma separated)</label>
            <input className="input" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="sweets, kachori, breakfast" />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Contact & Location</h2>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Address *</label>
            <input className="input" required maxLength={200} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area, Jaipur" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">Phone *</label>
              <input className="input" required maxLength={20} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98…" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">WhatsApp</label>
              <input className="input" maxLength={20} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+91 98…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">Latitude *</label>
              <input className="input" type="number" step="any" required value={form.lat} onChange={(e) => set('lat', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">Longitude *</label>
              <input className="input" type="number" step="any" required value={form.lng} onChange={(e) => set('lng', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Amenities</h2>
          {(
            [
              ['parking', 'Parking available'],
              ['cards', 'Accepts cards / UPI'],
              ['homeDelivery', 'Home delivery'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={attrs[key]}
                onChange={(e) => setAttrs((a) => ({ ...a, [key]: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="card text-xs text-slate-500">
          <p>
            Opening hours default to 9:00–21:00 for all {DAYS.length} days. You can adjust them after approval from
            your profile.
          </p>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Submitting…' : 'Submit Business'}
        </button>
      </form>
    </div>
  )
}
