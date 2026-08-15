import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { pastesApi } from '@/services/api'
import { APP_CONFIG } from '@/config'
import { useAuthStore } from '@/stores/auth'
import type { Paste, PasteComment } from '@/types'

export default function PasteViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [paste, setPaste] = useState<Paste | null>(null)
  const [comments, setComments] = useState<PasteComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commenting, setCommenting] = useState(false)

  // Report states
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDesc, setReportDesc] = useState('')
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => {
    if (id) {
      loadPaste()
      loadComments()
    }
  }, [id])

  async function loadPaste() {
    setLoading(true)
    setError('')
    try {
      const res = await pastesApi.get(id!)
      setPaste(res.paste)
    } catch (err: any) {
      setError(err.message || 'Failed to load paste')
    } finally {
      setLoading(false)
    }
  }

  async function loadComments() {
    try {
      const res = await pastesApi.comments(id!)
      setComments(res.comments)
    } catch {
      // Ignore comment errors if public access lacks permissions
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !id) return

    setCommenting(true)
    try {
      const res = await pastesApi.addComment(id, newComment.trim())
      setComments((prev) => [...prev, res.comment])
      setNewComment('')
    } catch (err: any) {
      alert(err.message || 'Could not add comment')
    } finally {
      setCommenting(false)
    }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return

    try {
      await pastesApi.report(id, reportReason, reportDesc.trim())
      setReportSent(true)
      setReportDesc('')
      setTimeout(() => {
        setReporting(false)
        setReportSent(false)
      }, 2000)
    } catch (err: any) {
      alert(err.message || 'Failed to send report')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this paste?') || !id) return

    try {
      await pastesApi.delete(id)
      alert('Paste deleted successfully')
      navigate('/pastes')
    } catch (err: any) {
      alert(err.message || 'Could not delete paste')
    }
  }

  function handleCopy() {
    if (!paste) return
    navigator.clipboard.writeText(paste.content)
    alert('Code copied to clipboard!')
  }

  if (loading) {
    return <div className="text-center py-12 text-sm text-slate-500">Loading paste contents...</div>
  }

  if (error || !paste) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="rounded bg-red-50 p-4 border border-red-200 inline-block max-w-sm">
          <p className="text-sm font-bold text-red-800">⚠️ Access Denied / Error</p>
          <p className="text-xs text-red-600 mt-2">{error || 'Paste not found or has expired.'}</p>
          <Link to="/pastes" className="btn btn-sm bg-slate-200 text-slate-700 text-xs mt-4 inline-block font-semibold py-1.5 px-3 rounded">
            Back to Discovery
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === paste.ownerId || user?.role === 'admin'

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Title block */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <Link to="/pastes" className="text-xs text-primary font-bold hover:underline">
            ← Back to Catalog
          </Link>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">
            {paste.title || paste.filename || 'Untitled Paste'}
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
            <span>By {paste.ownerName}</span>
            <span>•</span>
            <span>👁️ {paste.views} views</span>
            <span>•</span>
            <span>📥 {paste.downloads} raw hits</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 text-[10px]"
            title="Copy Paste to Clipboard"
          >
            📋 Copy
          </button>
          <a
            href={`${APP_CONFIG.apiUrl}/api/pastes/${paste.id}/raw`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 text-[10px]"
          >
            🌐 Raw
          </a>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 text-[10px]"
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      {/* Meta parameters */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {paste.language && (
          <span className="rounded bg-indigo-50 text-primary font-semibold px-2 py-0.5 uppercase">
            💻 {paste.language}
          </span>
        )}
        {paste.filename && (
          <span className="rounded bg-slate-100 text-slate-600 font-mono px-2 py-0.5">
            📄 {paste.filename}
          </span>
        )}
        <span className="rounded bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 capitalize">
          🔑 {paste.visibility}
        </span>
        {paste.expiresAt && (
          <span className="rounded bg-red-50 text-red-700 font-semibold px-2 py-0.5">
            ⌛ Expires: {new Date(paste.expiresAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Code Display */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 shadow-inner overflow-hidden">
        <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-750 flex items-center justify-between text-slate-400 font-mono text-[10px]">
          <span>{paste.filename || 'snippet'}</span>
          <span>{paste.content.length} bytes</span>
        </div>
        <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed max-h-[500px]">
          <code>{paste.content}</code>
        </pre>
      </div>

      {/* Interactive options */}
      <div className="flex justify-between items-center text-xs">
        <button
          onClick={() => setReporting(true)}
          className="text-red-500 font-bold hover:underline"
        >
          🚩 Report Abuse / Malicious Content
        </button>
        {paste.channelId && (
          <span className="text-[10px] text-slate-400">
            Shared in circle chat
          </span>
        )}
      </div>

      {/* Report Modal */}
      {reporting && (
        <div className="rounded border border-red-200 bg-red-50/50 p-4 space-y-3">
          <h3 className="font-bold text-red-800 text-sm">Report Paste</h3>
          {reportSent ? (
            <p className="text-xs text-red-700 font-semibold">Thank you. The report has been sent to administrators.</p>
          ) : (
            <form onSubmit={handleReport} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded border border-slate-200 p-2 text-xs bg-white focus:outline-none"
                  >
                    <option value="spam">Spam / Advertising</option>
                    <option value="harassment">Harassment / Bullying</option>
                    <option value="personal_info">Personal Info leak</option>
                    <option value="malicious">Malicious code / Phishing</option>
                    <option value="illegal">Illegal activities</option>
                    <option value="copyright">Copyright violation</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Provide any additional details..."
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm bg-red-600 text-white text-xs font-semibold py-1.5 px-3 rounded">
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="btn btn-sm bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Comments section */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-800">💬 Comments ({comments.length})</h2>

        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No comments on this paste yet.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="rounded bg-slate-50 p-2.5 border border-slate-100 text-xs">
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                  <span className="font-bold text-slate-600">{c.userName}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-700">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        {token ? (
          <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add a public comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 rounded border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-primary"
              required
            />
            <button
              type="submit"
              disabled={commenting || !newComment.trim()}
              className="rounded bg-primary hover:bg-primary-dark text-white font-bold px-4 text-xs disabled:bg-slate-200"
            >
              {commenting ? '...' : 'Post'}
            </button>
          </form>
        ) : (
          <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded text-center">
            Sign in to post comments on pastes.
          </p>
        )}
      </div>
    </div>
  )
}
