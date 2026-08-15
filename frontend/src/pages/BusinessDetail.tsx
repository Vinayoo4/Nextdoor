import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Business, Offer, Review } from '@/types'
import { businessesApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import MapView from '@/components/MapView'
import RatingStars from '@/components/RatingStars'
import { Spinner, ErrorBox } from '@/components/UI'
import { categoryMeta } from '@/utils/categories'
import { todayHours } from '@/utils/format'
import { APP_CONFIG } from '@/config'
import BusinessReviews from '@/components/BusinessReviews'
import BusinessEditModal from '@/components/BusinessEditModal'

export default function BusinessDetail() {
  const { slug } = useParams<{ slug: string }>()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [business, setBusiness] = useState<Business | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [reviewError, setReviewError] = useState('')

  // Admin edit states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editVerified, setEditVerified] = useState(false)
  const [editOwnerId, setEditOwnerId] = useState('')
  const [editLat, setEditLat] = useState(28.1928)
  const [editLng, setEditLng] = useState(76.6186)
  const [editPriority, setEditPriority] = useState(0)
  const [updating, setUpdating] = useState(false)

  // Claim states
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimName, setClaimName] = useState(user?.name || '')
  const [claimPhone, setClaimPhone] = useState('')
  const [claimEmail, setClaimEmail] = useState(user?.email || '')
  const [claimEvidence, setClaimEvidence] = useState('')
  const [claimNote, setClaimNote] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    businessesApi
      .get(slug)
      .then((res) => {
        setBusiness(res.business)
        setOffers(res.offers)
        setReviews(res.reviews)
        
        // Populate edit fields
        setEditName(res.business.name)
        setEditDescription(res.business.description || '')
        setEditAddress(res.business.address || '')
        setEditCategory(res.business.category || '')
        setEditPhone(res.business.phone || '')
        setEditWhatsapp(res.business.whatsapp || '')
        setEditVerified(res.business.verified || false)
        setEditOwnerId(res.business.ownerId || '')
        setEditLat(res.business.location?.lat ?? 28.1928)
        setEditLng(res.business.location?.lng ?? 76.6186)
        setEditPriority(res.business.priority ?? 0)

        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load business'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <Spinner />
  if (error || !business) return <div className="px-4 pt-4"><ErrorBox message={error || 'Business not found'} /></div>

  const meta = categoryMeta(business.category)
  const hours = todayHours(business.hours)
  const b = business

  async function toggleSave() {
    try {
      const res = await businessesApi.toggleSave(b.id)
      setSaved(res.saved)
    } catch {
      // ignore save errors in offline mode
    }
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!claimName.trim() || !claimPhone.trim() || !claimEmail.trim()) {
      setClaimError('Please fill in all required fields')
      return
    }

    setClaimLoading(true)
    setClaimError('')
    try {
      await businessesApi.claim(b.id, {
        contactName: claimName.trim(),
        contactPhone: claimPhone.trim(),
        contactEmail: claimEmail.trim(),
        verificationNote: claimNote.trim() || undefined,
        evidenceReference: claimEvidence.trim() || undefined,
      })
      setClaimSuccess(true)
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit verification claim')
    } finally {
      setClaimLoading(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!business) return
    setUpdating(true)
    try {
      const res = await businessesApi.update(business.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        address: editAddress.trim(),
        category: editCategory,
        phone: editPhone.trim(),
        whatsapp: editWhatsapp.trim() || null,
        verified: editVerified,
        owner_id: editOwnerId.trim() || null,
        location_lat: Number(editLat),
        location_lng: Number(editLng),
        priority: Number(editPriority),
      })
      setBusiness(res.business)
      setShowEditModal(false)
      alert('Business details updated successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to update business')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeleteBusiness() {
    if (!business) return
    if (!window.confirm(`Are you sure you want to permanently delete ${business.name}?`)) return
    try {
      await businessesApi.delete(business.id)
      alert('Business deleted successfully!')
      window.location.href = '/businesses'
    } catch (err: any) {
      alert(err.message || 'Failed to delete business')
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    setReviewError('')
    if (!token) {
      setReviewError('You must be signed in with your email to submit a review.')
      return
    }
    if (rating < 1) {
      setReviewError('Please select a rating')
      return
    }
    try {
      const res = await businessesApi.addReview(b.id, { rating, text })
      setReviews((r) => [res.review, ...r])
      setRating(0)
      setText('')
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review')
    }
  }

  return (
    <div className="px-4 pt-4">
      <Link to="/businesses" className="text-sm font-semibold text-primary">
        ← All businesses
      </Link>

      {user?.role === 'admin' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-primary font-bold rounded-lg text-xs transition-all border border-indigo-200"
          >
            ⚙️ Edit Place Details
          </button>
          <button
            onClick={handleDeleteBusiness}
            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-lg text-xs transition-all border border-red-200"
          >
            🗑️ Delete Place
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${meta.bg} ${meta.text} border ${meta.border}`}>
              {meta.emoji} {meta.label}
            </span>
            {business.verified && (
              <span className="chip bg-blue-50 text-verified border border-blue-100">✓ Verified</span>
            )}
          </div>
          <h1 className="mt-2 text-2xl">{business.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <RatingStars rating={business.ratingAvg} />
            <span>
              {business.ratingAvg > 0 ? business.ratingAvg.toFixed(1) : '—'} ({business.ratingCount} reviews)
            </span>
          </p>
        </div>
        <button onClick={toggleSave} className={`btn ${saved ? 'bg-amber-100 text-amber-700' : 'btn-outline'} shrink-0`}>
          {saved ? '✓ Saved' : '☆ Save'}
        </button>
      </div>

      {offers.length > 0 && (
        <div className="mt-4 space-y-2">
          {offers.map((o) => (
            <div key={o.id} className="rounded-xl border-2 border-dashed border-accent bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-800">🎉 {o.title}</p>
              <p className="mt-0.5 text-sm text-amber-700">{o.discount}</p>
              {o.code && (
                <p className="mt-1 text-xs">
                  Code: <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono font-bold">{o.code}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {business.description && <p className="mt-4 text-sm leading-relaxed text-slate-700">{business.description}</p>}

      <div className="card mt-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Details</h2>
        <p className="text-sm text-slate-600">📍 {business.address}</p>
        <p className="text-sm text-slate-600">
          🕐 {hours ? `${hours.open} – ${hours.close} today` : 'Hours not set'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {business.tags.map((t) => (
            <span key={t} className="chip bg-slate-100 text-slate-600">
              #{t}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
          {business.attributes.parking && <span className="chip bg-emerald-50 text-emerald-700">🅿️ Parking</span>}
          {business.attributes.cards && <span className="chip bg-emerald-50 text-emerald-700">💳 Cards/UPI</span>}
          {business.attributes.homeDelivery && <span className="chip bg-emerald-50 text-emerald-700">🛵 Delivery</span>}
        </div>
      </div>

      {business.location && (
        <div className="mt-4">
          <MapView
            points={[
              {
                id: business.id,
                name: business.name,
                category: business.category,
                location: business.location,
              },
            ]}
            center={business.location}
            zoom={15}
            className="h-56 w-full rounded-2xl"
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <a href={`tel:${business.phone.replace(/\s/g, '')}`} className="btn-primary w-full">
          📞 Call
        </a>
        {business.location && (
          <Link
            className="btn-outline w-full"
            to={`/navigate?lat=${business.location.lat}&lng=${business.location.lng}&name=${encodeURIComponent(business.name)}`}
          >
            🧭 Directions
          </Link>
        )}
      </div>

      {/* Claim Section */}
      {!business.ownerId && (
        <div className="card bg-indigo-50/20 border border-indigo-150 p-4 mt-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-800">Is this your business?</h3>
          <p className="text-xs text-slate-600">
            Submit a verification claim to manage hours, upload photos, reward customer reviews, and launch discount campaigns.
          </p>
          {showClaimForm ? (
            <form onSubmit={handleClaimSubmit} className="space-y-3 pt-2 border-t border-indigo-100">
              {claimError && <p className="text-xs font-semibold text-red-600">{claimError}</p>}
              {claimSuccess ? (
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200">
                  🎉 Verification claim request submitted successfully! An administrator will review your contact information.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Name</label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary bg-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                        <input
                          type="tel"
                          placeholder="Contact phone"
                          value={claimPhone}
                          onChange={(e) => setClaimPhone(e.target.value)}
                          className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input
                          type="email"
                          placeholder="Contact email"
                          value={claimEmail}
                          onChange={(e) => setClaimEmail(e.target.value)}
                          className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary bg-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Evidence / Proof Reference</label>
                      <input
                        type="text"
                        placeholder="Link to website, registration document ID, etc."
                        value={claimEvidence}
                        onChange={(e) => setClaimEvidence(e.target.value)}
                        className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Note to Admin</label>
                      <textarea
                        placeholder="Any additional details supporting your claim..."
                        value={claimNote}
                        onChange={(e) => setClaimNote(e.target.value)}
                        className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary bg-white"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={claimLoading} className="btn btn-sm bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-1.5 px-3 rounded">
                      {claimLoading ? 'Submitting...' : 'Submit Claim'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClaimForm(false)}
                      className="btn btn-sm bg-slate-250 hover:bg-slate-350 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <button
              onClick={() => {
                if (!token) {
                  alert('Please sign in to claim a business listing')
                  return
                }
                setShowClaimForm(true)
              }}
              className="btn btn-sm bg-primary hover:bg-primary-dark text-white font-bold py-1.5 px-3 rounded text-xs"
            >
              🙋 Claim Business
            </button>
          )}
        </div>
      )}

      <BusinessReviews
        reviews={reviews}
        rating={rating}
        setRating={setRating}
        text={text}
        setText={setText}
        reviewError={reviewError}
        handleSubmitReview={submitReview}
      />

      <BusinessEditModal
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        updating={updating}
        editName={editName}
        setEditName={setEditName}
        editCategory={editCategory}
        setEditCategory={setEditCategory}
        editAddress={editAddress}
        setEditAddress={setEditAddress}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editWhatsapp={editWhatsapp}
        setEditWhatsapp={setEditWhatsapp}
        editLat={editLat}
        setEditLng={setEditLng}
        editLng={editLng}
        setEditLat={setEditLat}
        editOwnerId={editOwnerId}
        setEditOwnerId={setEditOwnerId}
        editVerified={editVerified}
        setEditVerified={setEditVerified}
        editPriority={editPriority}
        setEditPriority={setEditPriority}
        handleEditSubmit={handleEditSubmit}
      />

      <p className="mt-6 pb-2 text-center text-xs text-slate-400">Listed on {APP_CONFIG.appName}</p>
    </div>
  )
}
