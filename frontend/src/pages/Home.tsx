import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Business } from '@/types'
import { businessesApi } from '@/services/api'
import MapView from '@/components/MapView'
import BusinessCard from '@/components/BusinessCard'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'
import { REWARI_CENTER } from '@/utils/format'
import { categoryMeta } from '@/utils/categories'

export default function Home() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [nearby, setNearby] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPosition(REWARI_CENTER),
        { timeout: 5000 }
      )
    } else {
      setPosition(REWARI_CENTER)
    }
  }, [])

  useEffect(() => {
    const lat = position?.lat ?? REWARI_CENTER.lat
    const lng = position?.lng ?? REWARI_CENTER.lng
    businessesApi
      .list({ lat: String(lat), lng: String(lng), limit: '20', sort: 'nearby' })
      .then((res) => {
        setNearby(res.businesses)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load businesses'))
      .finally(() => setLoading(false))
  }, [position])

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl">Around You</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        {position ? 'Nearby businesses and places' : 'Discovering your location…'}
      </p>

      <div className="mt-4">
        <MapView
          points={nearby
            .filter((b) => b.location)
            .map((b) => ({
              id: b.id,
              name: b.name,
              category: b.category,
              location: b.location!,
              popup: `<div class="px-2 py-1"><strong>${b.name}</strong><br/><span>${categoryMeta(b.category).label}</span><br/><a href="/businesses/${b.slug}" class="text-indigo-600 font-semibold text-xs">View details →</a></div>`,
            }))}
          center={position ?? REWARI_CENTER}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-base">Nearby Places</h2>
        <Link to="/businesses" className="text-sm font-semibold text-primary">
          See all →
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : nearby.length === 0 ? (
        <EmptyState emoji="📭" title="No businesses nearby yet" hint="Try the Explore tab to browse categories." />
      ) : (
        <div className="mt-3 space-y-3">
          {nearby.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}

      <Link to="/businesses/new" className="btn-primary fixed bottom-24 right-5 z-20 rounded-full px-5 py-3 shadow-lg">
        + Add Business
      </Link>
    </div>
  )
}
