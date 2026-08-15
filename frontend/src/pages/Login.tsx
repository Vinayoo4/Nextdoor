import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn } from '@clerk/react/legacy'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, isLoaded, setActive } = useSignIn()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-indigo-950">
        <p className="text-sm font-semibold text-indigo-200">Loading auth system…</p>
      </div>
    )
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn) return
    setError('')
    setLoading(true)
    try {
      const result = await signIn.create({
        identifier: email.trim(),
      })

      const firstFactor = result.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === 'email_code'
      ) as any

      if (!firstFactor) {
        throw new Error('Email verification is not supported for this account.')
      }

      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: firstFactor.emailAddressId,
      })
      setStep('otp')
    } catch (err: any) {
      setError(err.errors?.[0]?.message || err.message || 'Failed to request OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn || !setActive) return
    setError('')
    setLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp.trim(),
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        // Clerk session will automatically trigger the App.tsx SessionBootstrap component 
        // to sync the user info with the local backend and set local session tokens!
        navigate('/home', { replace: true })
      } else {
        setError('Sign in incomplete. Please try again.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-950 to-indigo-700 px-5 py-10">
      <div className="mb-6 flex flex-col items-center text-center text-white">
        <span className="text-5xl">🏘️</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-wide">NEXTDOOR</h1>
        <p className="mt-1 text-sm text-indigo-200">Welcome back to your neighborhood</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input text-slate-800 bg-white border border-slate-200 focus:border-primary font-semibold"
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

            {/* Clerk bot-protection CAPTCHA widget (must exist before signIn.create()) */}
            <div id="clerk-captcha" />

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP…' : 'Continue with Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs text-indigo-800 leading-normal">
              📧 Clerk has dispatched a real OTP verification code to <strong>{email}</strong>. Please check your inbox.
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="otp">
                Enter 6-digit OTP sent to {email}
              </label>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                className="input text-center text-2xl tracking-[0.5em] text-slate-850 bg-white border border-slate-200 focus:border-primary"
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
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
            <button
              type="button"
              className="mt-2 w-full text-sm text-slate-500 hover:text-slate-800"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError('')
              }}
            >
              Change Email
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-sm text-indigo-200">
        Secure passwordless sign in via Clerk.
      </p>
    </div>
  )
}
