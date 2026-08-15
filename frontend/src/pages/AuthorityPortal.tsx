import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { postsApi, adminApi } from '@/services/api'
import { Link, Navigate } from 'react-router-dom'
import type { BusinessClaimRequest, AdminUserEntry } from '@/types'

export default function AuthorityPortal() {
  const user = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab] = useState<'broadcast' | 'claims' | 'logs' | 'users'>('broadcast')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Claims states
  const [claims, setClaims] = useState<BusinessClaimRequest[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [adminNote, setAdminNote] = useState('')
  const [selectedClaim, setSelectedClaim] = useState<BusinessClaimRequest | null>(null)
  const [processingClaim, setProcessingClaim] = useState(false)

  // Users directory states
  const [users, setUsers] = useState<AdminUserEntry[]>([])
  const [userFilter, setUserFilter] = useState('')

  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === 'claims') {
        loadClaims()
      } else if (activeTab === 'logs') {
        loadLogs()
      } else if (activeTab === 'users') {
        loadUsers()
      }
    }
  }, [activeTab])

  if (user?.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  async function loadClaims() {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.listClaims('pending')
      setClaims(res.claims)
    } catch (err: any) {
      setError(err.message || 'Failed to load claim requests')
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs() {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getVerificationLog()
      setLogs(res.logs)
    } catch (err: any) {
      setError(err.message || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.listUsers()
      setUsers(res.users)
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await postsApi.create(`🚨 VERIFIED ANNOUNCEMENT: ${content}`)
      setContent('')
      alert('Announcement posted successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement')
    } finally {
      setLoading(false)
    }
  }

  async function handleReviewClaim(claimId: string, status: 'approved' | 'rejected') {
    setProcessingClaim(true)
    setError('')
    try {
      await adminApi.reviewClaim(claimId, status, adminNote.trim() || undefined)
      alert(`Claim request ${status} successfully.`)
      setSelectedClaim(null)
      setAdminNote('')
      loadClaims()
    } catch (err: any) {
      setError(err.message || 'Failed to process claim request')
    } finally {
      setProcessingClaim(false)
    }
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-red-700">Civic Authority Portal</h1>
        <p className="text-xs text-slate-500">Verified City Administration Dashboard</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex-1 pb-2 text-center text-xs font-semibold border-b-2 ${
            activeTab === 'broadcast' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'
          }`}
        >
          📢 Alerts Broadcast
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex-1 pb-2 text-center text-xs font-semibold border-b-2 ${
            activeTab === 'claims' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'
          }`}
        >
          🏬 Business Claims
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 pb-2 text-center text-xs font-semibold border-b-2 ${
            activeTab === 'logs' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'
          }`}
        >
          📋 Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 pb-2 text-center text-xs font-semibold border-b-2 ${
            activeTab === 'users' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'
          }`}
        >
          👥 Users
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-xs text-red-600 border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Broadcaster */}
      {activeTab === 'broadcast' && (
        <div className="space-y-4">
          <div className="card border-l-4 border-red-600">
            <h3 className="text-sm font-bold mb-1 text-slate-800">Broadcast Emergency or Civic Alert</h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Post a verified announcement to the local neighborhood feed. It will be highlighted as a civic alert.
            </p>

            <form onSubmit={handlePost} className="space-y-3">
              <textarea
                className="input min-h-[100px] resize-none text-sm p-3 border border-slate-200 rounded focus:outline-none focus:border-red-600 w-full"
                placeholder="E.g., Road repair work on Highway 9 starting tomorrow. Plan commute accordingly."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={450}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-350">
                {loading ? 'Broadcasting...' : 'Broadcast Alert'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card text-center py-4 bg-red-50/20 border border-red-100">
              <p className="text-2xl font-extrabold text-red-700">45</p>
              <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">Active Alerts</p>
            </div>
            <div className="card text-center py-4 bg-indigo-50/10 border border-indigo-100">
              <p className="text-2xl font-extrabold text-indigo-700">1.2K</p>
              <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">Citizens Reached</p>
            </div>
          </div>
        </div>
      )}

      {/* Claims */}
      {activeTab === 'claims' && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800">Pending Claims Verification ({claims.length})</h2>

          {selectedClaim ? (
            <div className="card space-y-3 border border-indigo-100 bg-indigo-50/5 p-4">
              <h3 className="font-bold text-slate-800 text-sm">Review Claim: {selectedClaim.businessName}</h3>
              
              <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
                <div>
                  <p className="font-bold text-slate-500 text-[10px] uppercase">Business ID</p>
                  <p className="font-mono text-[10px] truncate">{selectedClaim.businessId}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 text-[10px] uppercase">Requester</p>
                  <p>{selectedClaim.requesterName} ({selectedClaim.requesterEmail})</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-600 text-[10px] uppercase">Private Contact Information</p>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-150 space-y-1">
                  <p><strong>Name:</strong> {selectedClaim.privateContactName}</p>
                  <p><strong>Phone:</strong> {selectedClaim.privateContactPhone}</p>
                  <p><strong>Email:</strong> {selectedClaim.privateContactEmail}</p>
                </div>
              </div>

              {selectedClaim.verificationNote && (
                <div className="text-xs">
                  <p className="font-bold text-slate-600 text-[10px] uppercase">Verification Note</p>
                  <p className="bg-slate-50 p-2 rounded italic text-slate-600">{selectedClaim.verificationNote}</p>
                </div>
              )}

              {selectedClaim.evidenceReference && (
                <div className="text-xs">
                  <p className="font-bold text-slate-600 text-[10px] uppercase">Evidence References / Links</p>
                  <p className="bg-slate-50 p-2 rounded font-mono text-[10px] break-all">{selectedClaim.evidenceReference}</p>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Admin Audit Note</label>
                <textarea
                  placeholder="Reason for approval or rejection..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReviewClaim(selectedClaim.id, 'approved')}
                  disabled={processingClaim}
                  className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-xs"
                >
                  Approve &amp; Verify
                </button>
                <button
                  onClick={() => handleReviewClaim(selectedClaim.id, 'rejected')}
                  disabled={processingClaim}
                  className="btn btn-sm bg-red-650 hover:bg-red-750 text-white font-bold py-1.5 px-3 rounded text-xs"
                >
                  Reject Claim
                </button>
                <button
                  onClick={() => setSelectedClaim(null)}
                  disabled={processingClaim}
                  className="btn btn-sm bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1.5 px-3 rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {loading && <p className="text-xs text-slate-400">Loading claim requests...</p>}
              {!loading && claims.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-white p-4 rounded text-center border">
                  No pending business verification claims.
                </p>
              ) : (
                claims.map((claim) => (
                  <div key={claim.id} className="card p-3 flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{claim.businessName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Submitted by: {claim.requesterName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Date: {new Date(claim.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClaim(claim)
                        setAdminNote('')
                      }}
                      className="bg-indigo-50 text-primary hover:bg-indigo-100 font-bold text-[10px] px-2.5 py-1.5 rounded"
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-800">Verification Audit Trail</h2>
          {loading && <p className="text-xs text-slate-400">Loading logs...</p>}
          {!loading && logs.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-white p-4 rounded text-center border">
              No verification events recorded.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="rounded border border-slate-100 bg-white p-2.5 text-[11px] shadow-sm">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                    <span>🏬 {log.business_name}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 font-medium">
                    Action: <span className="bg-indigo-50 px-1 py-0.2 rounded font-bold capitalize text-primary text-[10px]">{log.action}</span> by {log.admin_name}
                  </p>
                  {log.note && <p className="text-slate-500 italic mt-0.5">Note: {log.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Directory */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-slate-800">Neighbor Directory ({users.length})</h2>
            <input
              type="text"
              placeholder="Search by name / email…"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-44 rounded border border-slate-200 bg-white p-1.5 text-xs focus:outline-none focus:border-red-600"
            />
          </div>
          {loading && <p className="text-xs text-slate-400">Loading users...</p>}
          {!loading && users.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-white p-4 rounded text-center border">
              No registered users yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {users
                .filter(
                  (u) =>
                    !userFilter.trim() ||
                    u.name.toLowerCase().includes(userFilter.toLowerCase()) ||
                    u.email.toLowerCase().includes(userFilter.toLowerCase())
                )
                .map((u) => (
                  <div key={u.id} className="rounded border border-slate-100 bg-white p-2.5 text-[11px] shadow-sm flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">
                        {u.name}{' '}
                        {u.role === 'admin' && (
                          <span className="ml-1 bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Super Admin</span>
                        )}
                        {u.role === 'owner' && (
                          <span className="ml-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Owner</span>
                        )}
                      </p>
                      <p className="text-slate-400 truncate">{u.email}</p>
                      <p className="text-[10px] text-slate-400">
                        📜 {u.postCount} posts · 💬 {u.messageCount} chats · ⭐ {u.points} pts
                      </p>
                    </div>
                    <Link
                      to={`/users/${u.id}`}
                      className="shrink-0 bg-indigo-50 text-primary hover:bg-indigo-100 font-bold text-[10px] px-2.5 py-1.5 rounded"
                    >
                      View Profile
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
