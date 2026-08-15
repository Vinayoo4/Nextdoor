import type { BusinessClaimRequest } from '@/types'

interface ClaimRequestTableProps {
  claims: BusinessClaimRequest[]
  selectedClaim: BusinessClaimRequest | null
  setSelectedClaim: (claim: BusinessClaimRequest | null) => void
  adminNote: string
  setAdminNote: (note: string) => void
  processingClaim: boolean
  handleReviewClaim: (claimId: string, status: 'approved' | 'rejected') => void
  loading: boolean
}

export default function ClaimRequestTable({
  claims,
  selectedClaim,
  setSelectedClaim,
  adminNote,
  setAdminNote,
  processingClaim,
  handleReviewClaim,
  loading,
}: ClaimRequestTableProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-extrabold text-slate-800">Pending Claims Verification ({claims.length})</h2>

      {selectedClaim ? (
        <div className="card space-y-3 border border-indigo-100 bg-indigo-50/5 p-4 text-left">
          <h3 className="font-bold text-slate-800 text-sm">Review Claim: {selectedClaim.businessName}</h3>

          <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
            <div>
              <p className="font-bold text-slate-500 text-[10px] uppercase">Business ID</p>
              <p className="font-mono text-[10px] truncate">{selectedClaim.businessId}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 text-[10px] uppercase">Requester</p>
              <p>
                {selectedClaim.requesterName} ({selectedClaim.requesterEmail})
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-600 text-[10px] uppercase">Private Contact Information</p>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-150 space-y-1">
              <p>
                <strong>Name:</strong> {selectedClaim.privateContactName}
              </p>
              <p>
                <strong>Phone:</strong> {selectedClaim.privateContactPhone}
              </p>
              <p>
                <strong>Email:</strong> {selectedClaim.privateContactEmail}
              </p>
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
              className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-xs animate-pulse-once"
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
        <div className="space-y-2 text-left">
          {loading && <p className="text-xs text-slate-400 animate-pulse">Loading claim requests...</p>}
          {!loading && claims.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-white p-4 rounded text-center border">
              No pending business verification claims.
            </p>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="card p-3 border rounded-xl flex justify-between items-start bg-slate-50">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{claim.businessName}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Submitted by: {claim.requesterName}</p>
                  <p className="text-[10px] text-slate-400">Date: {new Date(claim.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedClaim(claim)
                    setAdminNote('')
                  }}
                  className="bg-indigo-50 text-primary hover:bg-indigo-100 font-bold text-[10px] px-2.5 py-1.5 rounded transition-all"
                >
                  Review
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
