import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { pastesApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Paste } from '@/types'

const LANGUAGES = [
  { value: '', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
]

export default function PasteDiscovery() {
  const token = useAuthStore((s) => s.token)

  const [activeTab, setActiveTab] = useState<'public' | 'my' | 'create'>('public')
  const [pastes, setPastes] = useState<Paste[]>([])
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Editor states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('')
  const [filename, setFilename] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [expiresIn, setExpiresIn] = useState<'none' | '10m' | '1h' | '1d' | '1w'>('none')
  const [creating, setCreating] = useState(false)
  const [successPaste, setSuccessPaste] = useState<Paste | null>(null)

  useEffect(() => {
    if (activeTab === 'public') {
      loadPublicPastes()
    } else if (activeTab === 'my') {
      loadMyPastes()
    } else {
      setError('')
      setSuccessPaste(null)
    }
  }, [activeTab, search, langFilter])

  async function loadPublicPastes() {
    setLoading(true)
    setError('')
    try {
      const res = await pastesApi.list({ search, language: langFilter })
      setPastes(res.pastes)
    } catch (err: any) {
      setError(err.message || 'Failed to load public pastes')
    } finally {
      setLoading(false)
    }
  }

  async function loadMyPastes() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await pastesApi.myPastes()
      setPastes(res.pastes)
    } catch (err: any) {
      setError(err.message || 'Failed to load your pastes')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setCreating(true)
    setError('')
    setSuccessPaste(null)

    try {
      const res = await pastesApi.create({
        title: title.trim() || undefined,
        content,
        language: language || undefined,
        filename: filename.trim() || undefined,
        visibility,
        expiresIn,
      })
      setSuccessPaste(res.paste)
      // Reset form
      setTitle('')
      setContent('')
      setLanguage('')
      setFilename('')
      setVisibility('public')
      setExpiresIn('none')
    } catch (err: any) {
      setError(err.message || 'Failed to create paste')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">📋 Community Pastebin</h1>
        <span className="text-xs text-slate-400">Share snippets locally</span>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('public')}
          className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 ${
            activeTab === 'public' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
          }`}
        >
          Explore Catalog
        </button>
        {token && (
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 ${
              activeTab === 'my' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
            }`}
          >
            My Pastes
          </button>
        )}
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 ${
            activeTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
          }`}
        >
          ⚡ New Paste
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div className="card">
          {successPaste ? (
            <div className="rounded bg-emerald-50 p-4 border border-emerald-200 mb-2">
              <p className="text-sm font-bold text-emerald-800">🎉 Paste created successfully!</p>
              <p className="text-xs text-emerald-600 mt-1">
                Your paste is live. Anyone with access can view it.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/pastes/${successPaste.id}`}
                  className="btn btn-sm bg-primary text-white text-xs font-semibold py-1.5 px-3 rounded inline-block"
                >
                  View Paste
                </Link>
                <button
                  onClick={() => setSuccessPaste(null)}
                  className="btn btn-sm bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded inline-block"
                >
                  Create Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Paste Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Server Logs, Algorithm logic, Config setup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-200 p-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Filename (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. index.js"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="w-full rounded border border-slate-200 p-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Syntax Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded border border-slate-200 p-2 text-sm bg-white focus:border-primary focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={10}
                  placeholder="Paste or write your text/code here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded border border-slate-200 p-3 font-mono text-xs focus:border-primary focus:outline-none bg-slate-900 text-slate-100"
                  required
                />
                <span className="text-[10px] text-slate-400">Max size 100KB</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full rounded border border-slate-200 p-2 text-sm bg-white focus:border-primary focus:outline-none"
                  >
                    <option value="public">🌐 Public (Discoverable)</option>
                    <option value="unlisted">🔗 Unlisted (Link only)</option>
                    <option value="private">🔒 Private (Me only)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expiration</label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value as any)}
                    className="w-full rounded border border-slate-200 p-2 text-sm bg-white focus:border-primary focus:outline-none"
                  >
                    <option value="none">Never Expire</option>
                    <option value="10m">10 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="1d">1 Day</option>
                    <option value="1w">1 Week</option>
                  </select>
                </div>
              </div>

              {!token && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ You must be logged in to create pastes.
                </p>
              )}

              <button
                type="submit"
                disabled={creating || !token || !content.trim()}
                className="btn-primary w-full disabled:bg-slate-300"
              >
                {creating ? 'Saving...' : 'Publish Paste'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Public Catalog or My Pastes tabs */}
      {activeTab !== 'create' && (
        <div className="space-y-3">
          {activeTab === 'public' && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search pastes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded border border-slate-200 p-2 text-sm focus:outline-none focus:border-primary"
              />
              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="rounded border border-slate-200 p-2 text-sm bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All Languages</option>
                {LANGUAGES.filter(l => l.value).map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-sm text-slate-500">Loading pastes...</div>
          ) : pastes.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400 bg-white rounded border border-slate-100">
              No pastes found.
            </div>
          ) : (
            <div className="grid gap-3">
              {pastes.map((p) => (
                <Link
                  to={`/pastes/${p.id}`}
                  key={p.id}
                  className="card block hover:border-primary transition p-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {p.title || p.filename || 'Untitled Paste'}
                      </h3>
                      {p.filename && p.title && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.filename}</p>
                      )}
                    </div>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                      {p.language || 'plaintext'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 font-mono bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                    {p.content}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>👤 {p.ownerName}</span>
                      <span>👁️ {p.views} views</span>
                      <span>📥 {p.downloads} raw hits</span>
                    </div>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>

                  {p.visibility !== 'public' && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-semibold capitalize">
                        🔑 {p.visibility}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
