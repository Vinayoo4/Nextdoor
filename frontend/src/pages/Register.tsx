import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ message: string; devOtp?: string }>('/api/auth/otp/request', { email })
      setDevOtp(res.devOtp ?? '')
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ token: string; user: any }>('/api/auth/otp/verify', { email, otp, name })
      setAuth(res.token, res.user)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Join Nextdoor</h1>
        <p className="text-sm text-slate-500">Connect with your neighborhood.</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md border border-slate-100">
        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                className="input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {devOtp && (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                <strong>Dev OTP:</strong> {devOtp} (will be removed in production)
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="otp">
                Enter 6-digit OTP sent to {email}
              </label>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                className="input text-center text-2xl tracking-[0.5em]"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Verifying…' : 'Create Account'}
            </button>

            <button
              type="button"
              className="mt-2 w-full text-sm text-slate-500 hover:text-slate-800"
              onClick={() => {
                setStep('email')
                setOtp('')
                setDevOtp('')
                setError('')
              }}
            >
              Change Email / Details
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary">
          Sign In
        </Link>
      </p>
    </div>
  )
}
