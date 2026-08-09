import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  function signOut() {
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl">Profile</h1>

      <div className="card mt-4 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </span>
        <div>
          <h2 className="text-lg">{user?.name}</h2>
          <p className="text-sm text-slate-500">+91 {user?.phone}</p>
          <span className="chip mt-1 bg-indigo-50 text-primary capitalize">{user?.role}</span>
        </div>
      </div>

      <div className="card mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏅</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Neighborhood Points</p>
            <p className="text-xs text-slate-500">Earn by saving places, reviewing &amp; posting</p>
          </div>
        </div>
        <p className="text-2xl font-extrabold text-accent">{user?.points ?? 0}</p>
      </div>

      <div className="card mt-4 space-y-1">
        <p className="text-sm font-bold text-slate-700">How to earn points</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-500">
          <li>Save a business → +2 points</li>
          <li>Write a review → +5 points</li>
          <li>Post in the feed → +1 point</li>
        </ul>
      </div>

      <button onClick={signOut} className="btn-danger mt-6 w-full">
        Sign Out
      </button>
    </div>
  )
}
