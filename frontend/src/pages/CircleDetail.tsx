import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Channel, Message } from '@/types'
import { circlesApi, messagesApi } from '@/services/api'
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
    messagesApi
      .list(activeId)
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
  }, [activeId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, activeId])

  const activeChannel = channels.find((c) => c.id === activeId)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!activeId || !content.trim()) return
    setSending(true)
    try {
      const res = await messagesApi.send(activeId, content.trim())
      setMessages((m) => [...m, res.message])
      setContent('')
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
              <p className="text-xs font-bold text-slate-700">{m.authorName}</p>
              <p className="text-sm text-slate-800">{m.content}</p>
              <p className="mt-0.5 text-right text-[10px] text-slate-400">{timeAgo(m.createdAt)}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No messages yet — say hello!</p>
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Type a message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
        />
        <button type="submit" disabled={sending || !content.trim()} className="btn-primary shrink-0">
          Send
        </button>
      </form>
    </div>
  )
}
