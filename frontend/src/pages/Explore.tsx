import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Business, BusinessCategory } from '@/types'
import { businessesApi } from '@/services/api'
import MapView from '@/components/MapView'
import { Spinner, ErrorBox } from '@/components/UI'
import { CATEGORIES, categoryMeta } from '@/utils/categories'
import { JAIPUR_CENTER } from '@/utils/format'

export default function Explore() {
  const [category, setCategory] = useState<BusinessCategory | 'All'>('All')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { limit: '60' }
    if (category !== 'All') params.category = category
    businessesApi
      .list(params)
      .then((res) => {
        setBusinesses(res.businesses)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [category])

  const points = businesses.filter((b) => b.location)

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl">Explore Jaipur</h1>
      <p className="mt-0.5 text-sm text-slate-500">Browse places on the map by category</p>

      <div className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setCategory('All')}
          className={`chip shrink-0 border ${category === 'All' ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => {
          const active = category === c.value
          const meta = categoryMeta(c.value)
          return (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`chip shrink-0 border ${
                active ? 'border-primary bg-primary text-white' : `${meta.bg} ${meta.text} border ${meta.border}`
              }`}
            >
              {c.emoji} {c.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        <div className="mt-3">
          <MapView
            points={points.map((b) => ({
              id: b.id,
              name: b.name,
              category: b.category,
              location: b.location!,
              popup: `<div class="px-2 py-1"><strong>${b.name}</strong><br/><a href="/businesses/${b.slug}" class="text-indigo-600 font-semibold text-xs">View →</a></div>`,
            }))}
            center={JAIPUR_CENTER}
            zoom={12}
            className="h-[45vh] w-full rounded-2xl"
          />
          <p className="mt-2 text-center text-xs text-slate-400">{points.length} places shown</p>
          <Link to="/businesses" className="btn-outline mt-3 w-full">
            Browse full list →
          </Link>
        </div>
      )}
    </div>
  )
}
