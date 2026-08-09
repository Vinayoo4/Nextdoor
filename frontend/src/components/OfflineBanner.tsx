export default function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-white">
      You are offline — showing saved data
    </div>
  )
}
