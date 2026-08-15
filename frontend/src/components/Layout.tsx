import { NavLink, Outlet } from 'react-router-dom'
import { useOnline } from '@/hooks/useOnline'
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react'

const NAV = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/explore', label: 'Explore', icon: '🗺️' },
  { to: '/feed', label: 'Feed', icon: '💬' },
  { to: '/businesses', label: 'Businesses', icon: '🏬' },
  { to: '/circles', label: 'Circles', icon: '👥' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function Layout() {
  const online = useOnline()
  const { isSignedIn } = useUser()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-slate-50 md:shadow-lg">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-indigo-100 bg-primary px-4 md:px-6 py-3 md:py-4 text-white shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏘️</span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-wide">NEXTDOOR</p>
            <p className="text-[10px] text-indigo-200">Your Neighborhood</p>
          </div>
        </div>

        {/* Desktop Header Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition hover:text-indigo-200 flex items-center gap-1.5 py-1 ${
                  isActive ? 'text-white border-b-2 border-white font-extrabold' : 'text-indigo-150 font-semibold'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!online && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              Offline
            </span>
          )}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="bg-white/20 hover:bg-white/30 text-white font-bold py-1 px-3 rounded text-xs transition">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-indigo-100 hover:bg-indigo-50 text-indigo-900 font-bold py-1 px-3 rounded text-xs transition">
                  Sign Up
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-8 px-4 md:px-8 mt-4">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on larger screens) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
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
