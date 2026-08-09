export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm text-slate-600">{message}</p>
      {onRetry && (
        <button className="btn-outline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
