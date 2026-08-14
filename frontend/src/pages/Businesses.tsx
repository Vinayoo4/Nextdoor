import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Business, BusinessCategory } from '@/types'
import { businessesApi } from '@/services/api'
import BusinessCard from '@/components/BusinessCard'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'
import { CATEGORIES, categoryMeta } from '@/utils/categories'

export default function Businesses() {
  const [category, setCategory] = useState<BusinessCategory | 'All'>('All')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    const params: Record<string, string> = { limit: '30' }
    if (category !== 'All') params.category = category
    if (query) params.q = query
    if (verifiedOnly) params.verified = 'true'
    businessesApi
      .list(params)
      .then((res) => {
        setBusinesses(res.businesses)
        setTotal(res.total)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [category, query, verifiedOnly])

  return (
    <div className="px-4 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl">Businesses</h1>
          <p className="mt-0.5 text-sm text-slate-500">{total} places in Rewari</p>
        </div>
        <Link to="/businesses/new" className="btn-primary shrink-0">
          + Add
        </Link>
      </div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(q.trim())
        }}
      >
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search shops, services…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn-outline shrink-0">
            Search
          </button>
        </div>
      </form>

      <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
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

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setVerifiedOnly(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
        Verified businesses only
      </label>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : businesses.length === 0 ? (
        <EmptyState emoji="🔍" title="No results found" hint="Try a different category or search term." />
      ) : (
        <div className="mt-4 space-y-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </div>
  )
}
