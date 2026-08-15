import React from 'react'
import UserLink from '@/components/UserLink'

interface ManageMembersModalProps {
  showManageModal: boolean
  setShowManageModal: (val: boolean) => void
  circle: any
  currentUser: any
  editName: string
  setEditName: (val: string) => void
  editDescription: string
  setEditDescription: (val: string) => void
  mgmtSuccess: string
  setMgmtSuccess: (val: string) => void
  mgmtError: string
  setMgmtError: (val: string) => void
  pendingRequests: any[]
  members: any[]
  coAdminCount: number
  elderCount: number
  adminPinChange: string
  setAdminPinChange: (val: string) => void
  selectedChannelForPin: string
  setSelectedChannelForPin: (val: string) => void
  selectedChannelPin: string
  setSelectedChannelPin: (val: string) => void
  channels: any[]
  handleUpdateCircleDetails: (e: React.FormEvent) => void
  resolveRequest: (reqId: string, status: 'approved' | 'rejected') => void
  handleUpdateRole: (userId: string, newRole: string) => void
  handleUpdateCirclePin: () => void
  handleUpdateChannelPin: () => void
  handleDeleteCircle: () => void
}

export default function ManageMembersModal({
  showManageModal,
  setShowManageModal,
  circle,
  currentUser,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  mgmtSuccess,
  setMgmtSuccess,
  mgmtError,
  setMgmtError,
  pendingRequests,
  members,
  coAdminCount,
  elderCount,
  adminPinChange,
  setAdminPinChange,
  selectedChannelForPin,
  setSelectedChannelForPin,
  selectedChannelPin,
  setSelectedChannelPin,
  channels,
  handleUpdateCircleDetails,
  resolveRequest,
  handleUpdateRole,
  handleUpdateCirclePin,
  handleUpdateChannelPin,
  handleDeleteCircle,
}: ManageMembersModalProps) {
  if (!showManageModal) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-150 space-y-5 my-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">⚙️ Group Management Panel</h3>
            <p className="text-xs text-slate-500">Configure security settings, resolve user requests, and promote members.</p>
          </div>
          <button
            onClick={() => {
              setShowManageModal(false)
              setMgmtError('')
              setMgmtSuccess('')
            }}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {mgmtSuccess && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg font-semibold">{mgmtSuccess}</p>}
        {mgmtError && <p className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg font-semibold">{mgmtError}</p>}

        {/* Editable Group Settings (Personalization - Admin Only) */}
        {circle?.role === 'admin' && (
          <form onSubmit={handleUpdateCircleDetails} className="space-y-3.5 border-b pb-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Group Details Personalization</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Circle Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary"
                  maxLength={60}
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary"
                  maxLength={300}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary !py-1.5 !px-3 text-xs">
                Save Details
              </button>
            </div>
          </form>
        )}

        {/* Request List Section (Admin & Co-admin) */}
        <div className="space-y-2.5 border-b pb-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Access Join Requests ({pendingRequests.length})</h4>
          {pendingRequests.length === 0 ? (
            <p className="text-xs text-slate-400">No pending join requests.</p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex justify-between items-center bg-slate-50 border p-2 rounded-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{req.user_name}</p>
                    <p className="text-[10px] text-slate-500">{req.user_email}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => resolveRequest(req.id, 'approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold py-1 px-2.5 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => resolveRequest(req.id, 'rejected')}
                      className="bg-slate-300 hover:bg-slate-405 text-slate-700 text-[10px] font-semibold py-1 px-2.5 rounded"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Member Roles Promotions (Admin & Co-admin "Higher Authority") */}
        <div className="space-y-2.5 border-b pb-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Member Roles: Co-admins ({coAdminCount}/3) · Elders ({elderCount}/7)
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {members.map((m) => (
              <div key={m.userId} className="flex justify-between items-center bg-slate-50 border p-2 rounded-lg text-xs">
                <div>
                  <p className="font-bold text-slate-850">
                    <UserLink userId={m.userId} name={m.name} /> {m.userId === currentUser?.id && '(You)'}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">{m.role.replace('_', ' ')}</p>
                </div>
                {m.userId !== currentUser?.id && (
                  <select
                    value={m.role}
                    onChange={(e) => handleUpdateRole(m.userId, e.target.value)}
                    className="rounded border border-slate-200 bg-white p-1 text-[11px]"
                  >
                    <option value="member">Member</option>
                    <option value="elder">Elder</option>
                    {circle?.role === 'admin' && <option value="co_admin">Co-admin</option>}
                    {circle?.role === 'admin' && <option value="admin">Transfer Admin</option>}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings PIN configurations (Admin Only) */}
        {circle?.role === 'admin' && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Group PIN Config</h4>

            {circle?.pin && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-xs font-semibold">
                🔑 <strong>Current Circle Passcode:</strong> {circle.pin}
              </div>
            )}

            {/* Circle PIN update */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Circle Security PIN</label>
                <input
                  type="text"
                  placeholder="e.g. 1234 (leave blank to unlock)"
                  value={adminPinChange}
                  onChange={(e) => setAdminPinChange(e.target.value)}
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <button onClick={handleUpdateCirclePin} className="btn-primary !py-1.5 !px-3 text-xs shrink-0">
                Update PIN
              </button>
            </div>

            {/* Channel PIN update */}
            <div className="space-y-2 pt-2 border-t">
              <label className="block text-[10px] text-slate-500 uppercase font-semibold">Channel-specific PIN locks</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedChannelForPin}
                  onChange={(e) => setSelectedChannelForPin(e.target.value)}
                  className="rounded border border-slate-200 bg-white p-1.5 text-xs w-full"
                >
                  <option value="">-- Select Channel --</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="New Channel PIN"
                  value={selectedChannelPin}
                  onChange={(e) => setSelectedChannelPin(e.target.value)}
                  className="rounded border border-slate-200 p-1.5 text-xs w-full"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button onClick={handleUpdateChannelPin} disabled={!selectedChannelForPin} className="btn-primary !py-1.5 !px-3 text-xs">
                  Set Channel PIN
                </button>
              </div>
            </div>
          </div>
        )}

        {currentUser?.role === 'admin' && (
          <div className="pt-4 border-t border-red-150 mt-4">
            <button
              type="button"
              onClick={handleDeleteCircle}
              className="w-full bg-red-50 hover:bg-red-100 text-red-650 font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-red-200"
            >
              🗑️ Permanent Delete Circle (Moderator Action)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
