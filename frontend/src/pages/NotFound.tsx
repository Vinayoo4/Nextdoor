import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="text-6xl">🗺️</span>
      <h1 className="mt-4 text-xl">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">This corner of the neighborhood doesn’t exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Go Home
      </Link>
    </div>
  )
}
