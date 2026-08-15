import React from 'react'
import RatingStars from '@/components/RatingStars'

interface Review {
  id: string
  rating: number
  text: string
  ownerReply?: string | null
}

interface BusinessReviewsProps {
  reviews: Review[]
  rating: number
  setRating: (val: number) => void
  text: string
  setText: (val: string) => void
  reviewError: string
  handleSubmitReview: (e: React.FormEvent) => void
}

export default function BusinessReviews({
  reviews,
  rating,
  setRating,
  text,
  setText,
  reviewError,
  handleSubmitReview,
}: BusinessReviewsProps) {
  return (
    <section className="border-t pt-4 text-left">
      <h3 className="font-extrabold text-sm text-slate-800">Reviews &amp; Ratings</h3>
      <form onSubmit={handleSubmitReview} className="mt-3 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rating:</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-lg transition-colors ${star <= rating ? 'text-amber-500 font-extrabold' : 'text-slate-200'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="input min-h-20 resize-none text-sm w-full border rounded-lg p-2.5"
          placeholder="Share your experience…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />
        {reviewError && <p className="text-sm font-medium text-red-650">{reviewError}</p>}
        <button type="submit" className="btn-primary w-full py-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs">
          Submit Review
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card bg-slate-50 border p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <RatingStars rating={r.rating} size={14} />
              <span className="text-[10px] text-slate-400">neighbor</span>
            </div>
            <p className="text-sm text-slate-700">{r.text}</p>
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
  )
}
