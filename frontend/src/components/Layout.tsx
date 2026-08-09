import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useOnline } from '@/hooks/useOnline'

const NAV = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/explore', label: 'Explore', icon: '🗺️' },
  { to: '/feed', label: 'Feed', icon: '💬' },
  { to: '/businesses', label: 'Businesses', icon: '🏬' },
  { to: '/circles', label: 'Circles', icon: '👥' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const online = useOnline()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-indigo-100 bg-primary px-4 py-3 text-white shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏘️</span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-wide">NEXTDOOR</p>
            <p className="text-[10px] text-indigo-200">Your Neighborhood</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              Offline
            </span>
          )}
          <NavLink
            to="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold"
            aria-label="Profile"
          >
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </NavLink>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition ${
                  isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
