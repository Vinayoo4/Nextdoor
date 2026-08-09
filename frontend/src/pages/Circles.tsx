import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Circle } from '@/types'
import { circlesApi } from '@/services/api'
import { Spinner, ErrorBox, EmptyState } from '@/components/UI'

export default function Circles() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    circlesApi
      .list()
      .then((res) => {
        setCircles(res.circles)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load circles'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-4 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl">Circles</h1>
          <p className="mt-0.5 text-sm text-slate-500">Neighborhood groups and channels</p>
        </div>
        <Link to="/circles/new" className="btn-primary shrink-0">
          + Create
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : circles.length === 0 ? (
        <EmptyState emoji="👥" title="No circles yet" hint="Create the first circle for your area." />
      ) : (
        <div className="mt-4 space-y-3">
          {circles.map((c) => (
            <Link key={c.id} to={`/circles/${c.id}`} className="card block transition hover:border-primary/40 hover:shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">{c.name}</h2>
                <span className="chip bg-indigo-50 text-primary">{c.channelCount} channels</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{c.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
