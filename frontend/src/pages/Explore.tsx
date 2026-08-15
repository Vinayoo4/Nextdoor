import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Business, Building } from '@/types'
import { businessesApi, buildingsApi } from '@/services/api'
import MapView from '@/components/MapView'
import { Spinner, ErrorBox } from '@/components/UI'
import { REWARI_CENTER } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'

export default function Explore() {
  const currentUser = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab] = useState<'map' | 'heritage' | 'transit'>('map')
  
  // Datasets from backend
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Map settings
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(REWARI_CENTER)
  const [mapPoints, setMapPoints] = useState<any[]>([])
  const [focusedPointId, setFocusedPointId] = useState<string | undefined>(undefined)

  // Super Admin Add/Edit State
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null)
  const [bName, setBName] = useState('')
  const [bType, setBType] = useState<'govt' | 'hospital' | 'heritage' | 'transport' | 'emergency' | 'banking' | 'education' | 'worship'>('heritage')
  const [bAddress, setBAddress] = useState('')
  const [bTimings, setBTimings] = useState('')
  const [bContact, setBContact] = useState('')
  const [bDescription, setBDescription] = useState('')
  const [bLat, setBLat] = useState(28.1928)
  const [bLng, setBLng] = useState(76.6186)
  const [bServices, setBServices] = useState('')
  const [savingBuilding, setSavingBuilding] = useState(false)

  // 1. Fetch businesses on Places tab
  useEffect(() => {
    if (activeTab !== 'map') return
    setLoading(true)
    businessesApi
      .list({ limit: '100' })
      .then((res) => {
        // Filter: ONLY show SALTEDHASH and TRIU businesses
        const filtered = res.businesses.filter(
          (b) => b.name === 'SALTEDHASH' || b.name === 'TRIU'
        )
        // Sort by priority rank
        filtered.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        setBusinesses(filtered)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load places'))
      .finally(() => setLoading(false))
  }, [activeTab])

  // 2. Fetch landmarks/transit stands
  const loadBuildings = () => {
    setLoading(true)
    buildingsApi
      .list()
      .then((res) => {
        setBuildings(res.buildings)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load landmarks'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'heritage' || activeTab === 'transit') {
      loadBuildings()
    }
  }, [activeTab])

  // 3. Sync map points when active tab or datasets change
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
      const heritageList = buildings.filter(b => b.type === 'heritage' || b.type === 'worship')
      const pts = heritageList.filter(b => b.location).map((b) => ({
        id: b.id,
        name: b.name,
        category: b.type === 'worship' ? 'Worship' : 'Services',
        location: b.location!,
        popup: `<div class="p-2"><strong>${b.name}</strong><br/><p class="text-xs mt-0.5">${b.description || ''}</p></div>`
      }))
      setMapPoints(pts)
      if (pts.length > 0) {
        setMapCenter(pts[0].location)
      } else {
        setMapCenter({ lat: 28.1963, lng: 76.6120 })
      }
    } else if (activeTab === 'transit') {
      const transitList = buildings.filter(b => b.type === 'transport')
      const pts = transitList.filter(b => b.location).map((b) => ({
        id: b.id,
        name: b.name,
        category: 'Transport',
        location: b.location!,
        popup: `<div class="p-2"><strong>${b.name}</strong><br/><p class="text-xs mt-0.5">${b.description || ''}</p></div>`
      }))
      setMapPoints(pts)
      if (pts.length > 0) {
        setMapCenter(pts[0].location)
      } else {
        setMapCenter({ lat: 28.1970, lng: 76.6220 })
      }
    }
  }, [activeTab, businesses, buildings])

  function handleCenterPlace(id: string, lat: number, lng: number) {
    setMapCenter({ lat, lng })
    setFocusedPointId(id)
  }

  // Super Admin CRUD functions
  async function handleSaveBuilding(e: React.FormEvent) {
    e.preventDefault()
    setSavingBuilding(true)
    const servicesArr = bServices.split(',').map((s) => s.trim()).filter(Boolean)
    const payload = {
      name: bName.trim(),
      type: bType,
      address: bAddress.trim(),
      timings: bTimings.trim() || null,
      contact: bContact.trim() || null,
      description: bDescription.trim() || null,
      location_lat: Number(bLat),
      location_lng: Number(bLng),
      services: servicesArr
    }

    try {
      if (editingBuildingId) {
        await buildingsApi.update(editingBuildingId, payload)
        alert('Landmark updated successfully!')
      } else {
        await buildingsApi.create(payload)
        alert('Landmark added successfully!')
      }
      setShowAddBuilding(false)
      setEditingBuildingId(null)
      clearBuildingForm()
      loadBuildings()
    } catch (err: any) {
      alert(err.message || 'Failed to save landmark')
    } finally {
      setSavingBuilding(false)
    }
  }

  function handleEditBuildingClick(b: Building) {
    setEditingBuildingId(b.id)
    setBName(b.name)
    setBType(b.type as any)
    setBAddress(b.address || '')
    setBTimings(b.timings || '')
    setBContact(b.contact || '')
    setBDescription(b.description || '')
    setBLat(b.location?.lat ?? 28.1928)
    setBLng(b.location?.lng ?? 76.6186)
    setBServices(Array.isArray(b.services) ? b.services.join(', ') : '')
    setShowAddBuilding(true)
  }

  async function handleDeleteBuilding(buildingId: string) {
    if (!window.confirm('Are you sure you want to permanently delete this landmark?')) return
    try {
      await buildingsApi.delete(buildingId)
      alert('Landmark deleted successfully!')
      loadBuildings()
    } catch (err: any) {
      alert(err.message || 'Failed to delete landmark')
    }
  }

  function clearBuildingForm() {
    setBName('')
    setBAddress('')
    setBTimings('')
    setBContact('')
    setBDescription('')
    setBLat(28.1928)
    setBLng(76.6186)
    setBServices('')
  }

  const heritageList = buildings.filter((b) => b.type === 'heritage' || b.type === 'worship')
  const transitList = buildings.filter((b) => b.type === 'transport')

  return (
    <div className="px-4 pt-4 space-y-4 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold">Explore Rewari</h1>
          <p className="mt-0.5 text-sm text-slate-500 font-medium">History, heritage, and transportation stands in the city</p>
        </div>
        {currentUser?.role === 'admin' && (activeTab === 'heritage' || activeTab === 'transit') && (
          <button
            onClick={() => {
              setEditingBuildingId(null);
              clearBuildingForm();
              setBType(activeTab === 'transit' ? 'transport' : 'heritage');
              setShowAddBuilding(true);
            }}
            className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
          >
            + Add Location
          </button>
        )}
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

      {/* Map Segment */}
      <div className="card !p-1 border border-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm">
        <MapView
          points={mapPoints}
          center={mapCenter}
          zoom={13}
          className="h-[280px] w-full"
          selectedPointId={focusedPointId}
        />
        <p className="text-[10px] text-slate-400 text-center py-1 bg-slate-50">
          Showing {mapPoints.length} locations on Rewari City map
        </p>
      </div>

      {/* Tab contents */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorBox message={error} />
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioritized Local Entities</h3>
              {businesses.map((b) => (
                <div key={b.id} className="card p-3 border border-indigo-50/60 bg-indigo-50/5 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-slate-800">{b.name}</h4>
                      {b.verified && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-full font-bold">✓ Verified</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">📍 {b.address}</p>
                    <p className="text-[10px] text-slate-400">Category: {b.category} · Priority Rank: {b.priority ?? 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => b.location && handleCenterPlace(b.id, b.location.lat, b.location.lng)}
                      className="text-[10px] bg-indigo-50 text-primary font-bold px-2.5 py-1.5 rounded-lg hover:bg-indigo-100"
                    >
                      📍 Show on Map
                    </button>
                    <Link
                      to={`/businesses/${b.slug}`}
                      className="text-[10px] bg-primary text-white font-bold px-2.5 py-1.5 rounded-lg hover:bg-indigo-750"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
              {businesses.length === 0 && (
                <p className="text-xs text-slate-450 italic text-center py-6 bg-slate-50 rounded-xl">No active listings seeded yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'heritage' && (
        <div className="space-y-5">
          {/* Rewari History Column */}
          <div className="card bg-indigo-50/30 border border-indigo-100 p-4 space-y-2">
            <h3 className="text-sm font-extrabold text-indigo-905 flex items-center gap-1">
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
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical & Heritage Monuments ({heritageList.length})</h3>
            
            {loading ? (
              <Spinner />
            ) : heritageList.map((h) => (
              <div key={h.id} className="card bg-white border border-slate-100 p-4 space-y-2.5 transition hover:shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-800">{h.name}</h4>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full capitalize font-semibold">{h.type}</span>
                    </div>
                    {h.timings && <span className="text-[10px] bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full font-semibold mt-1.5 inline-block">⏱️ Timings: {h.timings}</span>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {currentUser?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => handleEditBuildingClick(h)}
                          className="text-[10px] bg-slate-100 text-slate-600 py-1 px-2 rounded hover:bg-slate-200"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBuilding(h.id)}
                          className="text-[10px] bg-red-50 text-red-650 py-1 px-2 rounded hover:bg-red-100"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => h.location && handleCenterPlace(h.id, h.location.lat, h.location.lng)}
                      className="text-[10px] bg-primary text-white py-1 px-2.5 rounded font-bold hover:bg-indigo-750"
                    >
                      📍 Show on Map
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{h.description}</p>
                <div className="flex gap-2 justify-end pt-1">
                  {h.location && (
                    <Link
                      to={`/navigate?lat=${h.location.lat}&lng=${h.location.lng}&name=${encodeURIComponent(h.name)}`}
                      className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
                    >
                      🚀 Navigate Offline
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {!loading && heritageList.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No historical landmarks listed yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transit' && (
        <div className="space-y-4">
          <div className="card bg-amber-50/20 border border-amber-100 p-4 space-y-1">
            <h3 className="text-sm font-extrabold text-amber-800">🚌 Local Transit Stands</h3>
            <p className="text-xs text-amber-905 leading-relaxed">
              Find main boarding gates and stands to travel in and around Rewari easily via bus, train, or sharing auto services.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transit Connections ({transitList.length})</h3>
            {loading ? (
              <Spinner />
            ) : transitList.map((t) => (
              <div key={t.id} className="card bg-white border border-slate-100 p-4 space-y-2 transition hover:shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="chip bg-indigo-50 text-primary text-[9px] font-bold py-0.5 px-2 rounded uppercase">Transit</span>
                    <h4 className="text-sm font-extrabold text-slate-850 mt-1">{t.name}</h4>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {currentUser?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => handleEditBuildingClick(t)}
                          className="text-[10px] bg-slate-100 text-slate-600 py-1 px-2 rounded hover:bg-slate-200"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBuilding(t.id)}
                          className="text-[10px] bg-red-50 text-red-650 py-1 px-2 rounded hover:bg-red-100"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => t.location && handleCenterPlace(t.id, t.location.lat, t.location.lng)}
                      className="text-[10px] bg-primary text-white py-1 px-2.5 rounded font-bold hover:bg-indigo-750"
                    >
                      📍 Show on Map
                    </button>
                  </div>
                </div>
                {t.timings && <p className="text-xs text-slate-500 font-semibold text-[11px]">Services: {t.timings}</p>}
                <p className="text-xs text-slate-600 leading-relaxed font-normal mt-1">{t.description}</p>
                <div className="flex justify-end pt-1">
                  {t.location && (
                    <Link
                      to={`/navigate?lat=${t.location.lat}&lng=${t.location.lng}&name=${encodeURIComponent(t.name)}`}
                      className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
                    >
                      🚀 Navigate Offline
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {!loading && transitList.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No transit connections listed yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Landmark Modal */}
      {showAddBuilding && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-150 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">
                  {editingBuildingId ? '⚙️ Edit Landmark' : '🏛️ Add Landmark / Transit Stand'}
                </h3>
                <p className="text-[10px] text-slate-500">Add civic coordinates, timings, and desc for the city guide.</p>
              </div>
              <button
                onClick={() => {
                  setShowAddBuilding(false);
                  setEditingBuildingId(null);
                  clearBuildingForm();
                }}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBuilding} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Name</label>
                  <input
                    type="text"
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Type</label>
                  <select
                    value={bType}
                    onChange={(e) => setBType(e.target.value as any)}
                    className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
                    required
                  >
                    <option value="heritage">Heritage landmark</option>
                    <option value="worship">Temple / Worship place</option>
                    <option value="transport">Transit terminal / Stand</option>
                    <option value="govt">Government department</option>
                    <option value="hospital">Hospital / Emergency clinic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Address</label>
                <input
                  type="text"
                  value={bAddress}
                  onChange={(e) => setBAddress(e.target.value)}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Timings / Service Info</label>
                  <input
                    type="text"
                    placeholder="e.g. 9:00 AM - 5:00 PM"
                    value={bTimings}
                    onChange={(e) => setBTimings(e.target.value)}
                    className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Contact Number</label>
                  <input
                    type="text"
                    value={bContact}
                    onChange={(e) => setBContact(e.target.value)}
                    className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={bLat}
                    onChange={(e) => setBLat(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={bLng}
                    onChange={(e) => setBLng(Number(e.target.value))}
                    className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
                <textarea
                  value={bDescription}
                  onChange={(e) => setBDescription(e.target.value)}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary min-h-16 bg-white text-slate-800"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Services / Features (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Museum, Parking, Restrooms"
                  value={bServices}
                  onChange={(e) => setBServices(e.target.value)}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="submit"
                  disabled={savingBuilding}
                  className="flex-1 btn-primary text-xs py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                >
                  {savingBuilding ? 'Saving...' : 'Save Details'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBuilding(false);
                    setEditingBuildingId(null);
                    clearBuildingForm();
                  }}
                  className="btn btn-outline text-xs py-2 px-4 border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
