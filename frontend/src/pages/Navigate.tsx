import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MapView from '@/components/MapView'
import { navigationApi } from '@/services/api'
import { Spinner, ErrorBox } from '@/components/UI'
import { REWARI_CENTER } from '@/utils/format'

export default function NavigatePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const toLat = parseFloat(params.get('lat') || '')
  const toLng = parseFloat(params.get('lng') || '')
  const name = params.get('name') || 'Destination'

  const [position, setPosition] = useState<{lat: number, lng: number} | null>(null)
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNaN(toLat) || isNaN(toLng)) {
      setError('Invalid destination coordinates')
      setLoading(false)
      return
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setPosition({ lat, lng })
          try {
            const data = await navigationApi.getRoute(lat, lng, toLat, toLng)
            setRoute(data)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch route')
          } finally {
            setLoading(false)
          }
        },
        () => {
          // fallback to center if geo fails
          const { lat, lng } = REWARI_CENTER
          setPosition({ lat, lng })
          navigationApi.getRoute(lat, lng, toLat, toLng)
            .then(data => setRoute(data))
            .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch route'))
            .finally(() => setLoading(false))
        },
        { timeout: 5000 }
      )
    } else {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
    }
  }, [toLat, toLng])

  if (loading) return <div className="px-4 pt-4"><Spinner /></div>
  if (error) return <div className="px-4 pt-4"><ErrorBox message={error} /></div>

  const routeGeoJSON = route?.geometry || route?.straightLine

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="bg-white p-4 shadow-sm z-10 flex flex-col gap-1">
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-lg font-bold truncate">Navigating to {name}</h1>
        {route && (
          <div className="flex gap-4 text-sm text-slate-600">
            <span>Distance: <strong className="text-slate-900">{route.distanceKm.toFixed(1)} km</strong></span>
            {route.durationSec && (
              <span>ETA: <strong className="text-slate-900">{Math.round(route.durationSec / 60)} min</strong></span>
            )}
            {route.fallback && <span className="text-amber-600 text-xs font-bold px-2 py-0.5 bg-amber-50 rounded">Offline Mode</span>}
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {position && (
          <MapView
            center={position}
            points={[
              { id: 'start', name: 'You are here', category: 'Services', location: position, popup: 'Start' },
              { id: 'end', name, category: 'Services', location: {lat: toLat, lng: toLng}, popup: 'Destination' }
            ]}
            routeGeoJSON={routeGeoJSON}
          />
        )}
      </div>
    </div>
  )
}
