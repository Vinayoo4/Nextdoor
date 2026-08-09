import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Business, Offer, Review } from '@/types'
import { businessesApi } from '@/services/api'
import MapView from '@/components/MapView'
import RatingStars from '@/components/RatingStars'
import { Spinner, ErrorBox } from '@/components/UI'
import { categoryMeta } from '@/utils/categories'
import { todayHours } from '@/utils/format'

export default function BusinessDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    businessesApi
      .get(slug)
      .then((res) => {
        setBusiness(res.business)
        setOffers(res.offers)
        setReviews(res.reviews)
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

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    setReviewError('')
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
          <a
            className="btn-outline w-full"
            href={`https://www.google.com/maps/search/?api=1&query=${business.location.lat},${business.location.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            🧭 Directions
          </a>
        )}
      </div>

      <section className="mt-6">
        <h2 className="text-base">Reviews</h2>
        <form onSubmit={submitReview} className="card mt-3 space-y-3">
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Rate this place</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  className={`text-2xl ${i <= rating ? 'text-amber-400' : 'text-slate-300'}`}
                  aria-label={`${i} star`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input min-h-20 resize-none"
            placeholder="Share your experience…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          {reviewError && <p className="text-sm font-medium text-red-600">{reviewError}</p>}
          <button type="submit" className="btn-primary w-full">
            Submit Review
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between">
                <RatingStars rating={r.rating} size={14} />
                <span className="text-xs text-slate-400">neighbor</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{r.text}</p>
              {r.ownerReply && (
                <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  <strong>Owner reply:</strong> {r.ownerReply}
                </p>
              )}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No reviews yet — be the first!</p>
          )}
        </div>
      </section>

      <p className="mt-6 pb-2 text-center text-xs text-slate-400">Listed on Nextdoor</p>
    </div>
  )
}
