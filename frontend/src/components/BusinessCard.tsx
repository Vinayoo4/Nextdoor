import { Link } from 'react-router-dom'
import type { Business } from '@/types'
import { categoryMeta } from '@/utils/categories'
import { todayHours } from '@/utils/format'

export default function BusinessCard({ business }: { business: Business }) {
  const meta = categoryMeta(business.category)
  const hours = todayHours(business.hours)

  return (
    <Link
      to={`/businesses/${business.slug}`}
      className="card block transition hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`chip ${meta.bg} ${meta.text} border ${meta.border}`}>
              {meta.emoji} {meta.label}
            </span>
            {business.verified && (
              <span className="chip bg-blue-50 text-verified border border-blue-100">✓ Verified</span>
            )}
            {business.plan === 'promoted' && (
              <span className="chip bg-amber-50 text-amber-700 border border-amber-100">★ Promoted</span>
            )}
          </div>
          <h3 className="mt-2 truncate text-base font-bold">{business.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{business.address}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold text-slate-800">{business.ratingAvg > 0 ? business.ratingAvg.toFixed(1) : '—'}</p>
          <p className="text-xs text-slate-400">★ ({business.ratingCount})</p>
        </div>
      </div>
      {hours && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
          <span className="text-slate-500">Today: {hours.open}–{hours.close}</span>
          <span className="font-medium text-emerald-600">Open now</span>
        </div>
      )}
    </Link>
  )
}
