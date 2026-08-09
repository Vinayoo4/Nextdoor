import { useEffect, useState } from 'react'
import type { EmergencyContact } from '@/types'
import { emergencyApi } from '@/services/api'
import { Spinner, ErrorBox } from '@/components/UI'
import { REWARI_CENTER } from '@/utils/format'

const TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  police: { label: 'Police', emoji: '👮', color: 'border-blue-200 bg-blue-50 text-blue-700' },
  ambulance: { label: 'Ambulance', emoji: '🚑', color: 'border-red-200 bg-red-50 text-red-700' },
  fire: { label: 'Fire', emoji: '🚒', color: 'border-orange-200 bg-orange-50 text-orange-700' },
  women: { label: 'Women Helpline', emoji: '🛡️', color: 'border-purple-200 bg-purple-50 text-purple-700' },
  other: { label: 'Helpline', emoji: '📞', color: 'border-slate-200 bg-slate-50 text-slate-700' },
}

export default function Emergency() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [nearby, setNearby] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = (lat: number, lng: number) => {
      emergencyApi
        .contacts(lat, lng)
        .then((res) => {
          setContacts(res.contacts)
          setNearby(res.nearby)
          setError('')
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load emergency contacts'))
        .finally(() => setLoading(false))
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => load(REWARI_CENTER.lat, REWARI_CENTER.lng),
        { timeout: 5000 }
      )
    } else {
      load(REWARI_CENTER.lat, REWARI_CENTER.lng)
    }
  }, [])

  function contactCard(c: EmergencyContact) {
    const meta = TYPE_META[c.type] ?? TYPE_META.other
    return (
      <div key={c.id ?? c.phone + c.name} className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl ${meta.color}`}>
            {meta.emoji}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">{c.name}</p>
            <p className="text-xs text-slate-500">{meta.label}{c.address ? ` · ${c.address}` : ''}</p>
          </div>
        </div>
        <a href={`tel:${c.phone}`} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
          {c.phone}
        </a>
      </div>
    )
  }

  if (loading) return <Spinner />
  if (error) return <div className="px-4 pt-4"><ErrorBox message={error} /></div>

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl bg-emergency p-4 text-white">
        <h1 className="text-xl">Emergency</h1>
        <p className="mt-0.5 text-sm text-red-100">
          One tap to call the right service. In danger? Call 112 now.
        </p>
        <a href="tel:112" className="btn mt-3 w-full bg-white !text-emergency">
          🚨 Call 112 (Emergency)
        </a>
      </div>

      <h2 className="mt-6 text-base">National Helplines</h2>
      <div className="mt-3 space-y-3">{contacts.map(contactCard)}</div>

      {nearby.length > 0 && (
        <>
          <h2 className="mt-6 text-base">Nearby Services</h2>
          <p className="text-xs text-slate-400">Closest to you right now</p>
          <div className="mt-3 space-y-3">{nearby.map(contactCard)}</div>
        </>
      )}

      <div className="card mt-6 bg-indigo-50 text-sm text-indigo-800">
        <p className="font-semibold">📌 Remember</p>
        <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
          <li>Save your home address for faster help.</li>
          <li>Share your live location with the helpline.</li>
          <li>Keep an offline map of your area downloaded.</li>
        </ul>
      </div>
    </div>
  )
}
