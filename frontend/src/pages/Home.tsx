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
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)

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

      {/* Red Emergency Contact floating button */}
      <button
        onClick={() => setShowEmergencyModal(true)}
        className="fixed bottom-24 right-5 z-20 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-3 shadow-xl flex items-center gap-1.5 transition-all text-xs tracking-wider"
      >
        🚨 Emergency Help
      </button>

      {/* Emergency Dialer Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-650 text-white p-5">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-2">
                  🚨 REWARI EMERGENCY DIALER
                </h3>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="bg-red-800 hover:bg-red-900 transition-colors text-white h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-red-100 mt-1">
                Tap any contact below to open your phone dialer instantly.
              </p>
            </div>

            <div className="p-4 space-y-2.5">
              <a
                href="tel:112"
                className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100/60 border border-red-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-red-700 text-[11px] uppercase tracking-wider">👮 Police Helpline</p>
                  <p className="text-[9px] text-slate-500">Rewari Central Station, Railway Chowk</p>
                </div>
                <div className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">
                  📞 112
                </div>
              </a>

              <a
                href="tel:101"
                className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100/60 border border-orange-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-orange-700 text-[11px] uppercase tracking-wider">🚒 Fire Station</p>
                  <p className="text-[9px] text-slate-500">Jhajjar Road Fire Terminal, Rewari</p>
                </div>
                <div className="bg-orange-600 text-white font-black text-xs px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">
                  📞 101
                </div>
              </a>

              <a
                href="tel:102"
                className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100/60 border border-emerald-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-emerald-700 text-[11px] uppercase tracking-wider">🚑 Ambulance &amp; Trauma</p>
                  <p className="text-[9px] text-slate-500">Civil Hospital Trauma Care Center</p>
                </div>
                <div className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">
                  📞 102
                </div>
              </a>

              <a
                href="tel:1091"
                className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100/60 border border-purple-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-purple-700 text-[11px] uppercase tracking-wider">🚺 Women Helpline</p>
                  <p className="text-[9px] text-slate-500">Women Special Police Station, Rewari</p>
                </div>
                <div className="bg-purple-600 text-white font-black text-xs px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">
                  📞 1091
                </div>
              </a>

              <a
                href="tel:1033"
                className="flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100/60 border border-indigo-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-indigo-700 text-[11px] uppercase tracking-wider">🛣️ NHAI Highway Help</p>
                  <p className="text-[9px] text-slate-500">National Highways Authority toll helpline</p>
                </div>
                <div className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">
                  📞 1033
                </div>
              </a>
            </div>
            
            <div className="bg-slate-50 px-4 py-3 border-t text-center">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="w-full text-slate-500 hover:text-slate-700 font-bold text-xs"
              >
                Close Emergency Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
