export default function RatingStars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ fontSize: size, lineHeight: 1 }}
          className={i <= full ? 'text-amber-400' : 'text-slate-300'}
        >
          ★
        </span>
      ))}
    </span>
  )
}
