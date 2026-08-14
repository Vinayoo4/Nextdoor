import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

const FEATURES = [
  {
    emoji: '🗺️',
    title: 'Neighborhood Map',
    desc: 'Find nearby businesses, buildings and landmarks on an interactive map of your city.',
  },
  {
    emoji: '🚨',
    title: 'Emergency Alerts',
    desc: 'One-tap access to police, ambulance, fire and helplines nearest to you.',
  },
  {
    emoji: '🏬',
    title: 'Local Businesses',
    desc: 'Discover verified shops and services with ratings, offers and directions.',
  },
  {
    emoji: '💬',
    title: 'Community Feed',
    desc: 'Share neighborhood news and updates with the people around you.',
  },
  {
    emoji: '👥',
    title: 'Circles & Channels',
    desc: 'Join resident groups and topic channels for lost & found, events and more.',
  },
  {
    emoji: '🏅',
    title: 'Earn Points',
    desc: 'Get rewarded for helping your neighborhood — save places, review and post.',
  },
]

export default function Landing() {
  const token = useAuthStore((s) => s.token)

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-700 px-6 pb-16 pt-12 text-white">
        <div className="mx-auto max-w-lg text-center">
          <span className="text-6xl">🏘️</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-wide">NEXTDOOR</h1>
          <p className="mt-2 text-indigo-200">Your Neighborhood, Your City Navigator</p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-indigo-100">
            Discover what’s around you — trusted local businesses, live community feed, resident circles, and
            emergency services all in one place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {token ? (
              <Link to="/home" className="btn-accent px-8">
                Open Nextdoor →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-accent px-8">
                  Get Started
                </Link>
                <Link to="/login" className="rounded-xl border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                  Sign In
                </Link>
              </>
            )}
          </div>
          <p className="mt-6 text-xs text-indigo-300">Works offline · Free · Made for your city</p>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-6 py-10">
        <h2 className="text-center text-lg">Everything your neighborhood needs</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex flex-col gap-2 p-4">
              <span className="text-2xl">{f.emoji}</span>
              <h3 className="text-sm font-bold">{f.title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-r from-primary to-indigo-800 p-6 text-center text-white">
          <h2 className="text-lg">Ready to join the neighborhood?</h2>
          <p className="mt-1 text-sm text-indigo-200">Free to join. Great for your community.</p>
          <Link
            to={token ? '/home' : '/register'}
            className="btn-accent mt-5 inline-flex w-full justify-center"
          >
            {token ? 'Continue' : 'Create your account'}
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Nextdoor · Built for Rewari first
      </footer>
    </div>
  )
}
