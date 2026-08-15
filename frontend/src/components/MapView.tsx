import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Business, LatLng } from '@/types'
import { categoryMeta } from '@/utils/categories'
import { APP_CONFIG, REWARI_CENTER } from '@/config'

interface MapPoint {
  id: string
  name: string
  category: Business['category']
  location: LatLng
  verified?: boolean
  popup?: string
}

const CATEGORY_ICON_COLORS: Record<string, string> = {
  Food: '#f97316',
  Healthcare: '#ef4444',
  Govt: '#6366f1',
  Banking: '#10b981',
  Education: '#3b82f6',
  Worship: '#a855f7',
  Transport: '#06b6d4',
  Shopping: '#ec4899',
  Services: '#64748b',
  Emergency: '#dc2626',
}

function iconFor(category: string) {
  const color = CATEGORY_ICON_COLORS[category] ?? '#4f46e5'
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;">${categoryMeta(category as Business['category']).emoji}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
}

export default function MapView({
  points,
  routeGeoJSON,
  center = REWARI_CENTER,
  zoom = 13,
  className = 'h-72 w-full rounded-2xl',
  selectedPointId,
}: {
  points: MapPoint[]
  routeGeoJSON?: any
  center?: LatLng
  zoom?: number
  className?: string
  selectedPointId?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const routeLayerRef = useRef<L.GeoJSON | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const rewariBounds = L.latLngBounds([28.00, 76.40], [28.38, 76.85])
    const map = L.map(containerRef.current, {
      attributionControl: true,
      maxBounds: rewariBounds,
      minZoom: 11,
      maxBoundsViscosity: 1.0,
    }).setView([center.lat, center.lng], Math.max(zoom, 12))

    L.tileLayer(APP_CONFIG.mapTileUrl, {
      maxZoom: 19,
      attribution: APP_CONFIG.osmAttribution,
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
  }, []) // Initialize map instance exactly once on mount

  useEffect(() => {
    const map = mapRef.current
    if (map) {
      map.setView([center.lat, center.lng], map.getZoom() || zoom)
    }
  }, [center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<string>()
    points.forEach((p) => {
      seen.add(p.id)
      if (markersRef.current[p.id]) return
      const marker = L.marker([p.location.lat, p.location.lng], { icon: iconFor(p.category) })
      if (p.popup) marker.bindPopup(p.popup)
      marker.addTo(map)
      markersRef.current[p.id] = marker
    })
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!seen.has(id)) {
        marker.remove()
        delete markersRef.current[id]
      }
    })
    if (points.length > 0 && !routeGeoJSON) {
      const group = L.featureGroup(Object.values(markersRef.current))
      if (points.length === 1) {
        map.setView([points[0].location.lat, points[0].location.lng], Math.max(zoom, 14))
      } else {
        map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 15 })
      }
    }
  }, [points, zoom, routeGeoJSON])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    if (routeGeoJSON) {
      const layer = L.geoJSON(routeGeoJSON, {
        style: {
          color: '#4f46e5',
          weight: 5,
          opacity: 0.8,
        },
      }).addTo(map)
      routeLayerRef.current = layer
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 16 })
    }
  }, [routeGeoJSON])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedPointId) return
    const marker = markersRef.current[selectedPointId]
    if (marker) {
      const latlng = marker.getLatLng()
      map.setView(latlng, Math.max(zoom, 15))
      marker.openPopup()
    }
  }, [selectedPointId, zoom])

  return <div ref={containerRef} className={className} />
}
