import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Channel, Message } from '@/types'
import { circlesApi, messagesApi, pastesApi } from '@/services/api'
import { Spinner, ErrorBox } from '@/components/UI'
import { timeAgo } from '@/utils/format'

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>()
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [newChannel, setNewChannel] = useState('')
  const [circleName, setCircleName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Share paste modal state
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteFilename, setPasteFilename] = useState('')
  const [pasteLanguage, setPasteLanguage] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [pasteExpiresIn, setPasteExpiresIn] = useState<'none' | '10m' | '1h' | '1d' | '1w'>('none')
  const [sharingPaste, setSharingPaste] = useState(false)
  const [messageExpiresIn, setMessageExpiresIn] = useState<'none' | '10m' | '1h' | '1d' | '1w'>('none')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    circlesApi
      .channels(id)
      .then((res) => {
        setChannels(res.channels)
        setCircleName(res.channels[0] ? '' : '')
        if (res.channels.length > 0) setActiveId(res.channels[0].id)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load circle'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!activeId) return

    const loadMessages = () => {
      messagesApi
        .list(activeId)
        .then((res) => {
          setMessages((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(res.messages)) {
              return prev
            }
            const isNearBottom = scrollRef.current 
              ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 120
              : true

            if (isNearBottom) {
              setTimeout(() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                }
              }, 50)
            }
            return res.messages
          })
        })
        .catch(() => setMessages([]))
    }

    loadMessages()
    const interval = setInterval(loadMessages, 4000)
    return () => clearInterval(interval)
  }, [activeId])

  const activeChannel = channels.find((c) => c.id === activeId)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!activeId || !content.trim()) return
    setSending(true)
    try {
      const res = await messagesApi.send(activeId, content.trim(), messageExpiresIn)
      setMessages((m) => [...m, res.message])
      setContent('')
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    } catch {
      // offline: message not sent, keep text
    } finally {
      setSending(false)
    }
  }

  async function addChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !newChannel.trim()) return
    try {
      const res = await circlesApi.createChannel(id, newChannel.trim())
      setChannels((c) => [...c, res.channel])
      setNewChannel('')
      setActiveId(res.channel.id)
    } catch {
      // ignore
    }
  }

  async function handleSharePaste(e: React.FormEvent) {
    e.preventDefault()
    if (!pasteContent.trim() || !activeId) return
    setSharingPaste(true)
    try {
      const res = await pastesApi.create({
        title: pasteTitle.trim() || undefined,
        content: pasteContent,
        language: pasteLanguage || undefined,
        filename: pasteFilename.trim() || undefined,
        visibility: 'channel',
        expiresIn: pasteExpiresIn,
        channelId: activeId,
      })
      if (res.message) {
        setMessages((m) => [...m, res.message!])
      }
      setPasteTitle('')
      setPasteFilename('')
      setPasteLanguage('')
      setPasteContent('')
      setPasteExpiresIn('none')
      setShowPasteModal(false)
    } catch (err: any) {
      alert(err.message || 'Failed to share paste')
    } finally {
      setSharingPaste(false)
    }
  }

  if (loading) return <Spinner />
  if (error || channels.length === 0)
    return (
      <div className="px-4 pt-4">
        <ErrorBox message={error || 'No channels in this circle yet'} />
      </div>
    )

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col px-4 pt-4">
      <h1 className="text-xl">{circleName || activeChannel?.name}</h1>
      <p className="mt-0.5 text-sm text-slate-500">Circle · {channels.length} channels</p>

      <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveId(ch.id)}
            className={`chip shrink-0 border ${
              ch.id === activeId ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            # {ch.name}
          </button>
        ))}
        <form onSubmit={addChannel} className="flex shrink-0 items-center gap-1">
          <input
            className="input !w-28 !px-2 !py-1 text-xs"
            placeholder="+ new channel"
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            maxLength={60}
          />
        </form>
      </div>

      <div ref={scrollRef} className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-3 shadow-sm">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-primary">
              {m.authorName[0]?.toUpperCase()}
            </span>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-bold text-slate-700">{m.authorName}</p>
                {m.expiresAt && (
                  <span className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0" title="Disappearing message">
                    ⏱️ {getExpiresInLabel(m.expiresAt)}
                  </span>
                )}
              </div>
              {m.type === 'paste' ? (
                <div className="mt-1 rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-left min-w-[200px]">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-1 text-[10px] font-mono text-slate-400">
                    <span className="truncate">📄 Paste: {m.content}</span>
                    <Link
                      to={`/pastes/${m.pasteId}`}
                      className="text-blue-400 hover:underline font-bold shrink-0"
                    >
                      Open Code ⚡
                    </Link>
                  </div>
                  <p className="text-[10px] font-mono text-slate-350 mt-1">
                    Click link to view paste in editor.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-800">{m.content}</p>
              )}
              <p className="mt-0.5 text-right text-[10px] text-slate-400">{timeAgo(m.createdAt)}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No messages yet — say hello!</p>
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setShowPasteModal(true)}
          className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-sm text-slate-600 shadow-sm shrink-0"
          title="Share Code Paste"
        >
          📄
        </button>
        <input
          className="input flex-1"
          placeholder="Type a message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
        />
        <select
          value={messageExpiresIn}
          onChange={(e) => setMessageExpiresIn(e.target.value as any)}
          className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-2.5 text-xs text-slate-600 shadow-sm shrink-0 focus:outline-none focus:border-primary"
          title="Disappearance Limit"
        >
          <option value="none">⏱️ Keep</option>
          <option value="10m">⏱️ 10m</option>
          <option value="1h">⏱️ 1h</option>
          <option value="1d">⏱️ 1d</option>
          <option value="1w">⏱️ 1w</option>
        </select>
        <button type="submit" disabled={sending || !content.trim()} className="btn-primary shrink-0">
          Send
        </button>
      </form>

      {/* Share Paste Modal Overlay */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4 border border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Share Code Paste to Channel</h3>
              <p className="text-xs text-slate-500">Shared pastes are stored inside the local paste database.</p>
            </div>

            <form onSubmit={handleSharePaste} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dockerfile configuration, Logs dump"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Filename (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. main.py"
                    value={pasteFilename}
                    onChange={(e) => setPasteFilename(e.target.value)}
                    className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Language</label>
                  <select
                    value={pasteLanguage}
                    onChange={(e) => setPasteLanguage(e.target.value)}
                    className="w-full rounded border border-slate-200 p-2 text-xs bg-white focus:outline-none focus:border-primary"
                  >
                    <option value="">Plain Text</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="python">Python</option>
                    <option value="markdown">Markdown</option>
                    <option value="sql">SQL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Code / Text Content</label>
                <textarea
                  rows={6}
                  placeholder="Write or paste your code snippet..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="w-full rounded border border-slate-200 p-2.5 font-mono text-[11px] focus:outline-none focus:border-primary bg-slate-900 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Expiration</label>
                <select
                  value={pasteExpiresIn}
                  onChange={(e) => setPasteExpiresIn(e.target.value as any)}
                  className="w-full rounded border border-slate-200 p-2 text-xs bg-white focus:outline-none focus:border-primary"
                >
                  <option value="none">Never Expire</option>
                  <option value="10m">10 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={sharingPaste || !pasteContent.trim()}
                  className="btn btn-sm bg-primary text-white text-xs font-semibold py-2 px-4 rounded flex-1"
                >
                  {sharingPaste ? 'Sharing...' : 'Share Paste'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="btn btn-sm bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function getExpiresInLabel(expiresAtStr: string) {
  const diffMs = new Date(expiresAtStr).getTime() - new Date().getTime()
  if (diffMs <= 0) return 'Expired'
  const diffMins = Math.ceil(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.ceil(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.ceil(diffHours / 24)
  return `${diffDays}d`
}
