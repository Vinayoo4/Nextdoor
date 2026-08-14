import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Business, BusinessCategory } from '@/types'
import { businessesApi } from '@/services/api'
import MapView from '@/components/MapView'
import { Spinner, ErrorBox } from '@/components/UI'
import { CATEGORIES, categoryMeta } from '@/utils/categories'
import { REWARI_CENTER } from '@/utils/format'

// Static Heritage Monuments of Rewari
const HERITAGE_PLACES = [
  {
    id: 'heritage_loco',
    name: 'Rewari Steam Locomotive Shed',
    category: 'Worship', // maps to heritage style
    location: { lat: 28.1882, lng: 76.6231 },
    timings: '9:00 AM - 5:00 PM',
    description: 'Established in 1893, it is the only surviving steam locomotive shed in India. It houses some of India\'s oldest steam engines, including the legendary "Fairy Queen" (built in 1855).',
    popup: `<div class="p-2"><strong>Steam Locomotive Shed</strong><br/><p class="text-xs mt-0.5">Oldest functional steam locomotives in the world.</p></div>`
  },
  {
    id: 'heritage_talaab',
    name: 'Rao Tej Singh Talaab (Bada Talaab)',
    category: 'Worship',
    location: { lat: 28.1963, lng: 76.6083 },
    timings: 'Open 24 hours',
    description: 'Built in 1815 by Rao Tej Singh. It features separate bathing ghats (steps) for men and women and a beautiful historic temple structure surrounding the reservoir.',
    popup: `<div class="p-2"><strong>Rao Tej Singh Talaab</strong><br/><p class="text-xs mt-0.5">Historic water reservoir built in 1815.</p></div>`
  },
  {
    id: 'heritage_baoli',
    name: 'Baoli Ghaus Ali Shah',
    category: 'Worship',
    location: { lat: 28.2045, lng: 76.6110 },
    timings: '8:00 AM - 6:00 PM',
    description: 'A historic three-storey stepwell constructed in the 18th century by Ghaus Ali Shah. It features an octagonal structure, restful rooms, and unique architectural archways.',
    popup: `<div class="p-2"><strong>Baoli Ghaus Ali Shah</strong><br/><p class="text-xs mt-0.5">18th century stepwell architectural wonder.</p></div>`
  },
  {
    id: 'heritage_house',
    name: 'Rampura House',
    category: 'Worship',
    location: { lat: 28.1906, lng: 76.6062 },
    timings: 'Private property (external view)',
    description: 'The historic residence of the descendants of Rao Tula Ram (a prominent hero of the 1857 Indian Mutiny), showcasing a mix of Rajput and colonial architecture.',
    popup: `<div class="p-2"><strong>Rampura House</strong><br/><p class="text-xs mt-0.5">Historic residency of Rao Tula Ram family.</p></div>`
  }
]

// Static Transport Stands of Rewari
const TRANSIT_PLACES = [
  {
    id: 'transit_rail',
    name: 'Rewari Junction Railway Station',
    type: 'Railway Station',
    location: { lat: 28.1983, lng: 76.6190 },
    platforms: 8,
    details: 'Major junction connecting Rewari to Delhi, Alwar, Rohtak, Bikaner, and Ringus. A historical junction established in 1873.',
    popup: `<div class="p-2"><strong>Rewari Junction Railway Station</strong><br/><p class="text-xs mt-0.5">Main trains board point.</p></div>`
  },
  {
    id: 'transit_bus',
    name: 'Rewari Central Bus Stand',
    type: 'Bus Stand',
    location: { lat: 28.1985, lng: 76.6265 },
    platforms: 'Multi-bay',
    details: 'Haryana Roadways central terminal on Jhajjar Road. Regular buses to Gurugram, Delhi (ISBT), Narnaul, Jhajjar, and Rohtak.',
    popup: `<div class="p-2"><strong>Central Bus Stand</strong><br/><p class="text-xs mt-0.5">Haryana Roadways bus terminal.</p></div>`
  },
  {
    id: 'transit_auto_brass',
    name: 'Brass Market Auto Stand',
    type: 'Local Auto Stand',
    location: { lat: 28.1892, lng: 76.6225 },
    platforms: 'Local E-Rickshaw/Auto',
    details: 'Centrally located stand for E-Rickshaws and autos servicing Model Town, Sector 3, Brass Market, and nearby markets.',
    popup: `<div class="p-2"><strong>Brass Market Auto Stand</strong><br/><p class="text-xs mt-0.5">E-rickshaws and sharing auto stands.</p></div>`
  },
  {
    id: 'transit_auto_chauk',
    name: 'Dharuhera Chauk Bypass Auto Stand',
    type: 'Bypass Auto Stand',
    location: { lat: 28.2048, lng: 76.6375 },
    platforms: 'Sharing Autos',
    details: 'Major intersection boarding point for local sharing autos towards Dharuhera industrial town, Bawal, and NH-48 bypass.',
    popup: `<div class="p-2"><strong>Dharuhera Chauk Auto Stand</strong><br/><p class="text-xs mt-0.5">Boarding point for Dharuhera/Bawal.</p></div>`
  }
]

export default function Explore() {
  const [activeTab, setActiveTab] = useState<'map' | 'heritage' | 'transit'>('map')
  const [category, setCategory] = useState<BusinessCategory | 'All'>('All')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Map settings
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(REWARI_CENTER)
  const [mapPoints, setMapPoints] = useState<any[]>([])

  useEffect(() => {
    if (activeTab !== 'map') return
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
  }, [category, activeTab])

  // Sync points when active tab changes
  useEffect(() => {
    if (activeTab === 'map') {
      const pts = businesses.filter((b) => b.location).map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        location: b.location!,
        popup: `<div class="p-2"><strong>${b.name}</strong><br/><a href="/businesses/${b.slug}" class="text-indigo-650 font-bold text-xs mt-1 inline-block">View Place →</a></div>`
      }))
      setMapPoints(pts)
      setMapCenter(REWARI_CENTER)
    } else if (activeTab === 'heritage') {
      setMapPoints(HERITAGE_PLACES)
      setMapCenter({ lat: 28.1963, lng: 76.6120 }) // center slightly around sites
    } else if (activeTab === 'transit') {
      const pts = TRANSIT_PLACES.map((t) => ({
        id: t.id,
        name: t.name,
        category: 'Services',
        location: t.location,
        popup: t.popup
      }))
      setMapPoints(pts)
      setMapCenter({ lat: 28.1970, lng: 76.6220 })
    }
  }, [activeTab, businesses])

  function handleCenterPlace(lat: number, lng: number) {
    setMapCenter({ lat, lng })
  }

  return (
    <div className="px-4 pt-4 space-y-4 pb-12">
      <div>
        <h1 className="text-xl font-bold">Explore Rewari</h1>
        <p className="mt-0.5 text-sm text-slate-500 font-medium">History, heritage, and transportation stands in the city</p>
      </div>

      {/* Explorer Tabs */}
      <div className="flex border-b text-xs font-bold uppercase tracking-wider text-center">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 pb-2.5 ${activeTab === 'map' ? 'border-b-2 border-primary text-primary font-extrabold' : 'text-slate-500'}`}
        >
          🗺️ Places Map
        </button>
        <button
          onClick={() => setActiveTab('heritage')}
          className={`flex-1 pb-2.5 ${activeTab === 'heritage' ? 'border-b-2 border-primary text-primary font-extrabold' : 'text-slate-500'}`}
        >
          🏛️ History & Sites
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`flex-1 pb-2.5 ${activeTab === 'transit' ? 'border-b-2 border-primary text-primary font-extrabold' : 'text-slate-500'}`}
        >
          🚌 Local Transit
        </button>
      </div>

      {/* Map Segment (Shared for context visual) */}
      <div className="card !p-1 border border-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm">
        <MapView
          points={mapPoints}
          center={mapCenter}
          zoom={13}
          className="h-[280px] w-full"
        />
        <p className="text-[10px] text-slate-400 text-center py-1 bg-slate-50">
          Showing {mapPoints.length} locations on Rewari City map
        </p>
      </div>

      {/* Tab contents */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button
              onClick={() => setCategory('All')}
              className={`chip shrink-0 border ${category === 'All' ? 'border-primary bg-primary text-white font-bold' : 'border-slate-200 bg-white text-slate-600'}`}
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
            <div className="space-y-2">
              <Link to="/businesses" className="btn-outline w-full text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1">
                Browse Full Place Directory →
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'heritage' && (
        <div className="space-y-5">
          {/* Rewari History Column */}
          <div className="card bg-indigo-50/50 border border-indigo-100 p-4 space-y-2">
            <h3 className="text-sm font-extrabold text-indigo-900 flex items-center gap-1">
              📜 The History of Rewari City
            </h3>
            <p className="text-xs text-indigo-950 leading-relaxed font-normal">
              Rewari holds deep historical significance dating back to the Mahabharata era, originally named <i>'Shalivahana'</i>. 
              The city is named after <b>Pranavati</b> (also called Revati), daughter of Raja Rewat.
              It is famous for being the capital of <b>Samrat Hem Chandra Vikramaditya (Hemu)</b>, 
              the last Hindu emperor of Delhi, and the birthplace of <b>Rao Tula Ram</b>, the legendary freedom fighter who led the 
              armed revolution against British forces in 1857.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider text-[10px] text-slate-500">Historical & Heritage Monuments</h3>
            
            {HERITAGE_PLACES.map((h) => (
              <div key={h.id} className="card bg-white border border-slate-100 p-4 space-y-2.5 transition hover:shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{h.name}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full font-semibold mt-1 inline-block">⏱️ Timings: {h.timings}</span>
                  </div>
                  <button
                    onClick={() => handleCenterPlace(h.location.lat, h.location.lng)}
                    className="text-[10px] bg-primary text-white py-1 px-2.5 rounded font-bold hover:bg-indigo-750 shrink-0"
                  >
                    📍 Show on Map
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{h.description}</p>
                <div className="flex gap-2 justify-end pt-1">
                  <Link
                    to={`/navigate?lat=${h.location.lat}&lng=${h.location.lng}&name=${encodeURIComponent(h.name)}`}
                    className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
                  >
                    🚀 Navigate Offline
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transit' && (
        <div className="space-y-4">
          <div className="card bg-amber-50/50 border border-amber-200/50 p-4 space-y-1">
            <h3 className="text-sm font-extrabold text-amber-800">🚌 Local Transit Stands</h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              Find main boarding gates and stands to travel in and around Rewari easily via bus, train, or sharing auto services.
            </p>
          </div>

          <div className="space-y-3">
            {TRANSIT_PLACES.map((t) => (
              <div key={t.id} className="card bg-white border border-slate-100 p-4 space-y-2 transition hover:shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="chip bg-indigo-50 text-primary text-[9px] font-bold py-0.5 px-2 rounded uppercase">{t.type}</span>
                    <h4 className="text-sm font-extrabold text-slate-850 mt-1">{t.name}</h4>
                  </div>
                  <button
                    onClick={() => handleCenterPlace(t.location.lat, t.location.lng)}
                    className="text-[10px] bg-primary text-white py-1 px-2.5 rounded font-bold hover:bg-indigo-750 shrink-0"
                  >
                    📍 Show on Map
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold text-[11px]">Boarding / Platform Info: {t.platforms}</p>
                <p className="text-xs text-slate-600 leading-relaxed font-normal mt-1">{t.details}</p>
                <div className="flex justify-end pt-1">
                  <Link
                    to={`/navigate?lat=${t.location.lat}&lng=${t.location.lng}&name=${encodeURIComponent(t.name)}`}
                    className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
                  >
                    🚀 Navigate Offline
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
