import { Link } from 'react-router-dom'
import { APP_CONFIG } from '@/config'

export default function Offline() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="text-6xl">📡</span>
      <h1 className="mt-4 text-xl">You’re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        {APP_CONFIG.appName} works with saved data. Reconnect to get the latest updates from your neighborhood.
      </p>
      <Link to="/home" className="btn-primary mt-6">
        Back to Home
      </Link>
    </div>
  )
}
