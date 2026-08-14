import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { circlesApi } from '@/services/api'
import { localDb } from '@/services/localDb'
import { useAuthStore } from '@/stores/auth'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'

export default function Circles() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  
  const [circles, setCircles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // PIN modal states
  const [activeCircle, setActiveCircle] = useState<any | null>(null)
  const [pin, setPin] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [requestedStatus, setRequestedStatus] = useState<string | null>(null)

  function load() {
    setLoading(true)
    circlesApi
      .list()
      .then((res) => {
        setCircles(res.circles)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load circles'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCircleClick(c: any, e: React.MouseEvent) {
    e.preventDefault()
    if (!token) {
      alert('Please log in with your email to access circles.')
      return
    }

    const localUnlocked = await localDb.isCircleUnlocked(c.id)
    if (!c.hasPin || c.isMember || localUnlocked) {
      navigate(`/circles/${c.id}`)
      return
    }

    // Must unlock via PIN or request
    setActiveCircle(c)
    setPin('')
    setModalError('')
    setRequestedStatus(null)
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault()
    if (!activeCircle || !pin.trim()) return
    setModalError('')
    setModalLoading(true)
    try {
      await circlesApi.verifyPin(activeCircle.id, pin.trim())
      await localDb.unlockCircle(activeCircle.id)
      setActiveCircle(null)
      navigate(`/circles/${activeCircle.id}`)
    } catch (err: any) {
      setModalError(err.message || 'Invalid PIN code')
    } finally {
      setModalLoading(false)
    }
  }

  async function handleRequestAccess() {
    if (!activeCircle) return
    setModalError('')
    setModalLoading(true)
    try {
      await circlesApi.requestAccess(activeCircle.id)
      setRequestedStatus('Access request submitted! A Co-Admin or Admin will review your join request.')
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit join request')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Circles</h1>
          <p className="mt-0.5 text-sm text-slate-500">Neighborhood groups and channels</p>
        </div>
        <Link to="/circles/new" className="btn-primary shrink-0">
          + Create
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : circles.length === 0 ? (
        <EmptyState emoji="👥" title="No circles yet" hint="Create the first circle for your area." />
      ) : (
        <div className="mt-4 space-y-3">
          {circles.map((c) => (
            <a
              key={c.id}
              href={`/circles/${c.id}`}
              onClick={(e) => handleCircleClick(c, e)}
              className="card block transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">{c.name}</h2>
                  {c.hasPin && !c.isMember && (
                    <span className="text-sm" title="Locked Circle">🔒</span>
                  )}
                  {c.isMember && (
                    <span className="chip bg-emerald-50 text-emerald-700 text-[10px] font-bold py-0.5 px-1.5 rounded">Joined</span>
                  )}
                </div>
                <span className="chip bg-indigo-50 text-primary">{c.channelCount} channels</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{c.description}</p>
            </a>
          ))}
        </div>
      )}

      {/* Security PIN Gate Modal */}
      {activeCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-850">🔒 Enter Group Code</h3>
              <p className="text-xs text-slate-500 mt-1">"{activeCircle.name}" requires a number passkey set by the Admin.</p>
            </div>

            {requestedStatus ? (
              <div className="space-y-4">
                <p className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 p-3 rounded-lg leading-relaxed">
                  {requestedStatus}
                </p>
                <button
                  onClick={() => setActiveCircle(null)}
                  className="btn btn-sm w-full bg-slate-200 text-slate-700 font-semibold py-2 rounded"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Enter Group Passkey</label>
                  <input
                    type="password"
                    placeholder="Number Passkey"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-center font-mono text-lg focus:outline-none focus:border-primary bg-slate-50"
                    maxLength={20}
                    required
                  />
                </div>

                {modalError && <p className="text-xs text-red-600 font-semibold">{modalError}</p>}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="btn btn-sm bg-primary text-white font-semibold py-2 rounded w-full text-xs"
                  >
                    {modalLoading ? 'Unlocking...' : 'Unlock Now'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRequestAccess}
                      disabled={modalLoading}
                      className="btn btn-sm bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold text-xs py-1.5 px-3 rounded flex-1"
                    >
                      Request Join Access
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCircle(null)}
                      className="btn btn-sm bg-slate-200 text-slate-700 text-xs py-1.5 px-3 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
