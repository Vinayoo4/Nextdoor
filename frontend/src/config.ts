// Central runtime configuration. Every value is overridable via Vite env vars
// (frontend/.env, all prefixed VITE_). See frontend/.env.example.

function num(name: string, fallback: number): number {
  const raw = import.meta.env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Nextdoor',
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  rewariCenter: {
    lat: num('VITE_REWARI_CENTER_LAT', 28.1928),
    lng: num('VITE_REWARI_CENTER_LNG', 76.6186),
  },
  mapTileUrl:
    import.meta.env.VITE_MAP_TILE_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  osmAttribution:
    import.meta.env.VITE_OSM_ATTRIBUTION ??
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}

export const REWARI_CENTER = APP_CONFIG.rewariCenter
