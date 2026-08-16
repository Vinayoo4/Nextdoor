import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MapView from '@/components/MapView'
import { navigationApi } from '@/services/api'
import { Spinner, ErrorBox } from '@/components/UI'
import { REWARI_CENTER, haversineKm } from '@/utils/format'

export default function NavigatePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const toLat = parseFloat(params.get('lat') || '')
  const toLng = parseFloat(params.get('lng') || '')
  const name = params.get('name') || 'Destination'

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startName, setStartName] = useState('Your Location')

  // Check if coordinates are within the Rewari area boundary
  function isInsideRewari(lat: number, lng: number): boolean {
    return lat >= 28.00 && lat <= 28.38 && lng >= 76.40 && lng <= 76.85
  }

  useEffect(() => {
    if (isNaN(toLat) || isNaN(toLng)) {
      setError('Invalid destination coordinates')
      setLoading(false)
      return
    }

    // Proceed with navigation regardless of strict boundary checks for destination coordinates

    function calculateLocalFallback(startLat: number, startLng: number) {
      const dist = haversineKm({ lat: startLat, lng: startLng }, { lat: toLat, lng: toLng })
      setRoute({
        fallback: true,
        distanceKm: dist,
        durationSec: Math.round(dist * 120), // approx 2 min per km
        straightLine: {
          type: 'LineString',
          coordinates: [
            [startLng, startLat],
            [toLng, toLat]
          ]
        }
      })
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          let lat = pos.coords.latitude
          let lng = pos.coords.longitude
          
          if (!isInsideRewari(lat, lng)) {
            console.log('User location is outside Rewari boundary, falling back start to REWARI_CENTER')
            lat = REWARI_CENTER.lat
            lng = REWARI_CENTER.lng
            setStartName('Start (Rewari Center)')
          } else {
            setStartName('Your Location')
          }
          
          setPosition({ lat, lng })

          try {
            const data = await navigationApi.getRoute(lat, lng, toLat, toLng)
            setRoute(data)
          } catch (err) {
            console.log('Server routing failed, falling back to client-side haversine calculation.')
            calculateLocalFallback(lat, lng)
          } finally {
            setLoading(false)
          }
        },
        () => {
          // Fallback current location to Rewari center
          const { lat, lng } = REWARI_CENTER
          setStartName('Start (Rewari Center)')
          setPosition({ lat, lng })
          navigationApi.getRoute(lat, lng, toLat, toLng)
            .then(data => setRoute(data))
            .catch(() => {
              console.log('Server routing failed, using client-side haversine fallback.')
              calculateLocalFallback(lat, lng)
            })
            .finally(() => setLoading(false))
        },
        { timeout: 5000 }
      )
    } else {
      const { lat, lng } = REWARI_CENTER
      setStartName('Start (Rewari Center)')
      setPosition({ lat, lng })
      calculateLocalFallback(lat, lng)
      setLoading(false)
    }
  }, [toLat, toLng])

  if (loading) return <div className="px-4 pt-4"><Spinner /></div>
  if (error) return <div className="px-4 pt-4"><ErrorBox message={error} /></div>

  const routeGeoJSON = route?.geometry || route?.straightLine

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] md:h-[calc(100vh-11rem)]">
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
            {route.fallback && <span className="text-amber-600 text-xs font-bold px-2 py-0.5 bg-amber-50 rounded">Offline Fallback</span>}
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {position && (
          <MapView
            center={position}
            points={[
              { id: 'start', name: startName, category: 'Services', location: position, popup: 'Start' },
              { id: 'end', name, category: 'Services', location: { lat: toLat, lng: toLng }, popup: 'Destination' }
            ]}
            routeGeoJSON={routeGeoJSON}
          />
        )}
      </div>
    </div>
  )
}
