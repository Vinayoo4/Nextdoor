import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { circlesApi, messagesApi, pastesApi } from '@/services/api'
import { localDb } from '@/services/localDb'
import { useAuthStore } from '@/stores/auth'
import { Spinner, ErrorBox } from '@/components/UI'
import { timeAgo } from '@/utils/format'

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  
  const [circle, setCircle] = useState<any | null>(null)
  const [isCircleUnlockedForSession, setIsCircleUnlockedForSession] = useState(false)
  const [circlePinInput, setCirclePinInput] = useState('')
  const [circlePinError, setCirclePinError] = useState('')

  const [channels, setChannels] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [newChannel, setNewChannel] = useState('')
  const [newChannelPin, setNewChannelPin] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // PIN protection for channel
  const [channelPin, setChannelPin] = useState('')
  const [channelPinError, setChannelPinError] = useState('')
  const [unlockedChannelIds, setUnlockedChannelIds] = useState<string[]>([])

  // Admin & Co-admin management panels
  const [showManageModal, setShowManageModal] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  
  // Customization fields
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [adminPinChange, setAdminPinChange] = useState('')
  const [selectedChannelForPin, setSelectedChannelForPin] = useState('')
  const [selectedChannelPin, setSelectedChannelPin] = useState('')
  const [mgmtSuccess, setMgmtSuccess] = useState('')
  const [mgmtError, setMgmtError] = useState('')

  // Share paste modal state
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteFilename, setPasteFilename] = useState('')
  const [pasteLanguage, setPasteLanguage] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [pasteExpiresIn, setPasteExpiresIn] = useState<'none' | '10m' | '1h' | '1d' | '1w'>('none')
  const [sharingPaste, setSharingPaste] = useState(false)
  const [messageExpiresIn, setMessageExpiresIn] = useState<'none' | '10m' | '1h' | '1d' | '1w'>('none')

  // Count metrics for role limits
  const coAdminCount = members.filter((m) => m.role === 'co_admin').length
  const elderCount = members.filter((m) => m.role === 'elder').length

  // Load Circle details and check membership
  function loadCircleDetails() {
    if (!id) return
    setLoading(true)
    circlesApi
      .getCircle(id)
      .then((res) => {
        setCircle(res.circle)
        setEditName(res.circle.name)
        setEditDescription(res.circle.description || '')
        
        // If not protected by PIN, or already unlocked for the session, load channels
        if (!res.circle.hasPin || isCircleUnlockedForSession) {
          loadChannels()
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load circle details')
        setLoading(false)
      })
  }

  function loadChannels() {
    if (!id) return
    circlesApi
      .channels(id)
      .then((res) => {
        setChannels(res.channels)
        if (res.channels.length > 0 && !activeId) {
          setActiveId(res.channels[0].id)
        }
        setError('')
      })
      .catch((err) => {
        setError(err.message || 'Failed to load circle channels')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCircleDetails()
  }, [id, isCircleUnlockedForSession])

  // Poll transient messages and merge into local IndexedDB
  useEffect(() => {
    if (!activeId) return
    setMessages([])
    
    // Load local messages first
    localDb.getMessages(activeId).then((localMsgs) => {
      setMessages(localMsgs)
    })

    const loadMessages = () => {
      // Don't poll if channel is locked and not yet unlocked locally
      const activeCh = channels.find((c) => c.id === activeId)
      if (activeCh?.hasPin && !unlockedChannelIds.includes(activeId || '')) {
        return
      }

      messagesApi
        .list(activeId)
        .then(async (res) => {
          // Merge incoming transient messages with local IndexedDB
          await localDb.saveMessages(res.messages)
          // Fetch updated merged log
          const merged = await localDb.getMessages(activeId)
          
          setMessages((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(merged)) {
              return prev
            }
            // Auto scroll to bottom
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }, 50)
            return merged
          })
        })
        .catch(() => {})
    }

    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [activeId, unlockedChannelIds, channels])

  // Load admin management datasets (requests and members)
  const fetchManagementData = () => {
    if (!id || !circle) return
    const role = circle.role
    if (role === 'admin' || role === 'co_admin') {
      circlesApi.listRequests(id).then((res) => {
        setPendingRequests(res.requests)
      }).catch(() => {})
    }
    circlesApi.listMembers(id).then((res) => {
      setMembers(res.members)
    }).catch(() => {})
  }

  useEffect(() => {
    if (showManageModal) {
      fetchManagementData()
    }
  }, [showManageModal, circle, id])

  const activeChannel = channels.find((c) => c.id === activeId)
  const isChannelLocked = activeChannel?.hasPin && !unlockedChannelIds.includes(activeId || '')

  // Unlock Circle via PIN (for session entry)
  async function handleVerifyCirclePin(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !circlePinInput.trim()) return
    setCirclePinError('')
    try {
      await circlesApi.verifyPin(id, circlePinInput.trim())
      setIsCircleUnlockedForSession(true)
      setCirclePinInput('')
    } catch (err: any) {
      setCirclePinError(err.message || 'Invalid Group Passkey')
    }
  }

  // Request Circle Access
  async function handleRequestCircleAccess() {
    if (!id) return
    setCirclePinError('')
    try {
      await circlesApi.requestAccess(id)
      alert('Access request submitted to group co-admins!')
    } catch (err: any) {
      setCirclePinError(err.message || 'Failed to submit join request')
    }
  }

  // Verify Channel PIN
  async function handleVerifyChannelPin(e: React.FormEvent) {
    e.preventDefault()
    if (!activeId || !channelPin.trim()) return
    setChannelPinError('')
    try {
      await circlesApi.verifyChannelPin(activeId, channelPin.trim())
      await localDb.unlockChannel(activeId)
      setUnlockedChannelIds((prev) => [...prev, activeId])
      setChannelPin('')
    } catch (err: any) {
      setChannelPinError(err.message || 'Invalid channel PIN')
    }
  }

  // Send message
  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!activeId || !content.trim()) return
    setSending(true)
    try {
      const res = await messagesApi.send(activeId, content.trim(), messageExpiresIn)
      // Save locally
      await localDb.saveMessage(res.message)
      setMessages((m) => [...m, res.message])
      setContent('')
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    } catch {
      // Offline fallback: write local mock post
      const offlineMsg = {
        id: Math.random().toString(),
        channel_id: activeId,
        user_id: currentUser?.id || '000000000000000000000000',
        author_name: currentUser?.name || 'Guest User',
        content: content.trim(),
        type: 'text',
        paste_id: null,
        created_at: new Date().toISOString()
      }
      await localDb.saveMessage(offlineMsg)
      setMessages((m) => [...m, offlineMsg])
      setContent('')
    } finally {
      setSending(false)
    }
  }

  // Add Channel
  async function addChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !newChannel.trim()) return
    try {
      const res = await circlesApi.createChannel(id, newChannel.trim(), newChannelPin.trim() || undefined)
      setChannels((c) => [...c, res.channel])
      setNewChannel('')
      setNewChannelPin('')
      setActiveId(res.channel.id)
    } catch (err: any) {
      alert(err.message || 'Failed to create channel')
    }
  }

  // Share code paste
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
      if (res.paste) {
        // Save paste & message to local IndexedDB
        await localDb.savePaste(res.paste)
        if (res.message) {
          await localDb.saveMessage(res.message)
          setMessages((m) => [...m, res.message!])
        }
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

  // Manage requests resolution
  async function resolveRequest(reqId: string, status: 'approved' | 'rejected') {
    if (!id) return
    setMgmtError('')
    setMgmtSuccess('')
    try {
      await circlesApi.resolveRequest(id, reqId, status)
      setMgmtSuccess(`Join request successfully ${status}!`)
      fetchManagementData()
    } catch (err: any) {
      setMgmtError(err.message || 'Failed to resolve request')
    }
  }

  // Promote / Update role (Admin & Co-admin management)
  async function handleUpdateRole(memberId: string, newRole: string) {
    if (!id || !circle) return
    setMgmtError('')
    setMgmtSuccess('')
    
    // Co-admins cannot promote anyone to co_admin or admin
    if (circle.role === 'co_admin' && (newRole === 'co_admin' || newRole === 'admin')) {
      setMgmtError('Co-admins can only promote/demote Elders.')
      return
    }

    try {
      await circlesApi.updateRole(id, memberId, newRole)
      setMgmtSuccess('User role successfully updated!')
      fetchManagementData()
    } catch (err: any) {
      setMgmtError(err.message || 'Failed to update user role')
    }
  }

  // Edit circle details metadata
  async function handleUpdateCircleDetails(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setMgmtError('')
    setMgmtSuccess('')
    try {
      await circlesApi.updateCircle(id, editName.trim(), editDescription.trim())
      setMgmtSuccess('Group personalization settings saved!')
      // Refresh details
      const res = await circlesApi.getCircle(id)
      setCircle(res.circle)
    } catch (err: any) {
      setMgmtError(err.message || 'Failed to save settings')
    }
  }

  // Update circle PIN
  async function handleUpdateCirclePin() {
    if (!id) return
    setMgmtError('')
    setMgmtSuccess('')
    try {
      await circlesApi.updatePin(id, adminPinChange.trim())
      setMgmtSuccess('Circle Security PIN updated!')
      setAdminPinChange('')
    } catch (err: any) {
      setMgmtError(err.message || 'Failed to update circle PIN')
    }
  }

  // Update channel PIN
  async function handleUpdateChannelPin() {
    if (!selectedChannelForPin) return
    setMgmtError('')
    setMgmtSuccess('')
    try {
      await circlesApi.updateChannelPin(selectedChannelForPin, selectedChannelPin.trim())
      setMgmtSuccess('Channel PIN successfully updated!')
      setSelectedChannelPin('')
      // refresh channel list
      const res = await circlesApi.channels(id!)
      setChannels(res.channels)
    } catch (err: any) {
      setMgmtError(err.message || 'Failed to update channel PIN')
    }
  }

  if (loading) return <Spinner />

  // CASE 1: User is NOT a member of this circle (Display Join Entry Gate)
  if (circle && !circle.isMember) {
    return (
      <div className="px-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔒</span>
            <h2 className="text-lg font-extrabold text-slate-800">{circle.name}</h2>
            <p className="text-sm text-slate-500 leading-normal">{circle.description || 'No description provided.'}</p>
            <p className="text-xs text-amber-600 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-100">
              You are not a member of this private circle. You must enter the group passkey or request access to join.
            </p>
          </div>

          <form onSubmit={handleVerifyCirclePin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">Enter Group Passkey</label>
              <input
                type="password"
                placeholder="PIN Code / Passkey"
                value={circlePinInput}
                onChange={(e) => setCirclePinInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-center font-mono text-lg focus:outline-none focus:border-primary bg-slate-50"
                maxLength={20}
                required
              />
            </div>

            {circlePinError && <p className="text-xs text-red-650 font-bold text-center">{circlePinError}</p>}

            <div className="flex flex-col gap-2 pt-2">
              <button type="submit" className="btn-primary w-full py-2.5 text-xs font-bold rounded-lg">
                Unlock &amp; Join Group
              </button>
              <button
                type="button"
                onClick={handleRequestCircleAccess}
                className="btn btn-outline border-slate-200 hover:bg-slate-50 py-2 text-xs font-bold text-slate-600 rounded-lg w-full"
              >
                Request Join Access
              </button>
              <button
                type="button"
                onClick={() => navigate('/circles')}
                className="btn btn-sm bg-slate-100 text-slate-600 py-1.5 text-xs font-semibold rounded-lg w-full mt-2"
              >
                Back to List
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // CASE 2: User IS a member, but must enter PIN for the current session (Verify Passcode Gate)
  if (circle && circle.hasPin && !isCircleUnlockedForSession) {
    return (
      <div className="px-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔑</span>
            <h2 className="text-lg font-extrabold text-slate-800">Enter Group Passkey</h2>
            <p className="text-xs text-slate-500">
              For security, you must input the number passkey to enter <b>{circle.name}</b>.
            </p>
          </div>

          <form onSubmit={handleVerifyCirclePin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter Circle Passkey"
              value={circlePinInput}
              onChange={(e) => setCirclePinInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-center font-mono text-lg focus:outline-none focus:border-primary bg-slate-50"
              maxLength={20}
              required
            />
            {circlePinError && <p className="text-xs text-red-600 text-center font-bold">{circlePinError}</p>}
            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-bold rounded-lg">
              Verify Passkey
            </button>
            <button
              type="button"
              onClick={() => navigate('/circles')}
              className="btn btn-sm bg-slate-100 text-slate-500 py-2 text-xs font-semibold rounded-lg w-full"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (error)
    return (
      <div className="px-4 pt-4">
        <ErrorBox message={error} />
      </div>
    )

  const isCoAdminOrAdmin = circle?.role === 'admin' || circle?.role === 'co_admin'

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col px-4 pt-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{activeChannel?.name || 'Circle Details'}</h1>
          <p className="mt-0.5 text-sm text-slate-500 font-medium">Circle · {channels.length} channels</p>
        </div>
        {isCoAdminOrAdmin && (
          <button
            onClick={() => setShowManageModal(true)}
            className="btn btn-outline btn-sm text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 border-primary text-primary"
          >
            ⚙️ Group Admin Panel
          </button>
        )}
      </div>

      {/* Channel list Chips */}
      <div className="scrollbar-hide -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveId(ch.id)}
            className={`chip shrink-0 border ${
              ch.id === activeId ? 'border-primary bg-primary text-white font-semibold' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            # {ch.name} {ch.hasPin && '🔒'}
          </button>
        ))}

        {/* Create new channel form (Admin/Co-admin only) */}
        {isCoAdminOrAdmin && (
          <form onSubmit={addChannel} className="flex shrink-0 items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-dashed border-slate-305">
            <input
              className="input !w-28 !px-2 !py-0.5 !text-[11px]"
              placeholder="+ new channel name"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              maxLength={60}
              required
            />
            <input
              className="input !w-16 !px-1.5 !py-0.5 !text-[11px]"
              placeholder="PIN (opt)"
              value={newChannelPin}
              onChange={(e) => setNewChannelPin(e.target.value)}
              maxLength={20}
            />
            <button type="submit" className="btn-primary !py-0.5 !px-2 !text-[10px]">Add</button>
          </form>
        )}
      </div>

      {/* Chat pane or Channel PIN Gate */}
      {channels.length === 0 ? (
        <div className="mt-3 flex-1 flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
          <span className="text-4xl">💬</span>
          <h2 className="text-base font-extrabold text-slate-800 font-bold">No Channels Yet</h2>
          <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed font-semibold">
            {isCoAdminOrAdmin 
              ? "There are no channels in this group yet. Use the '+ new channel name' form above to create the first channel and start chatting!"
              : "This group doesn't have any channels yet. Please check back later once the Admin creates a channel."
            }
          </p>
        </div>
      ) : isChannelLocked ? (
        <div className="mt-3 flex-1 flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="text-center space-y-1">
            <span className="text-4xl">🔑</span>
            <h2 className="text-base font-extrabold text-slate-800">Locked Channel</h2>
            <p className="text-xs text-slate-500">Please enter the PIN code for #{activeChannel?.name}.</p>
          </div>
          <form onSubmit={handleVerifyChannelPin} className="w-full max-w-xs space-y-3">
            <input
              type="password"
              placeholder="Channel PIN"
              value={channelPin}
              onChange={(e) => setChannelPin(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-center font-mono focus:outline-none focus:border-primary bg-slate-50"
              maxLength={20}
              required
            />
            {channelPinError && <p className="text-xs text-red-600 text-center font-semibold">{channelPinError}</p>}
            <button type="submit" className="btn-primary w-full text-xs py-2">
              Unlock Channel
            </button>
          </form>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-primary">
                  {m.author_name ? m.author_name[0]?.toUpperCase() : m.authorName[0]?.toUpperCase()}
                </span>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-bold text-slate-700">{m.author_name || m.authorName}</p>
                    {m.expires_at && (
                      <span className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0" title="Disappearing message">
                        ⏱️ {getExpiresInLabel(m.expires_at)}
                      </span>
                    )}
                  </div>
                  {m.type === 'paste' ? (
                    <div className="mt-1 rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-left min-w-[200px]">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-750 pb-1 text-[10px] font-mono text-slate-400">
                        <span className="truncate">📄 Paste: {m.content}</span>
                        <Link
                          to={`/pastes/${m.paste_id}`}
                          className="text-blue-400 hover:underline font-bold shrink-0"
                        >
                          Open Code ⚡
                        </Link>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        Click link to view paste in editor.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-800 leading-normal">{m.content}</p>
                  )}
                  <p className="mt-0.5 text-right text-[10px] text-slate-400">{timeAgo(m.created_at || m.createdAt)}</p>
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
              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-sm text-slate-650 shadow-sm shrink-0"
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
        </>
      )}

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
                  className="w-full rounded border border-slate-200 p-2.5 font-mono text-[11px] focus:outline-none focus:border-primary bg-slate-900 text-slate-105"
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
                  className="btn btn-sm bg-slate-200 text-slate-705 text-xs font-semibold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin & Co-admin Panel Modal Drawer */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-150 space-y-5 my-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">⚙️ Group Management Panel</h3>
                <p className="text-xs text-slate-500">Configure security settings, resolve user requests, and promote members.</p>
              </div>
              <button onClick={() => { setShowManageModal(false); setMgmtError(''); setMgmtSuccess(''); }} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>

            {mgmtSuccess && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg font-semibold">{mgmtSuccess}</p>}
            {mgmtError && <p className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg font-semibold">{mgmtError}</p>}

            {/* Editable Group Settings (Personalization - Admin Only) */}
            {circle?.role === 'admin' && (
              <form onSubmit={handleUpdateCircleDetails} className="space-y-3.5 border-b pb-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Group Details Personalization</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Circle Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary"
                      maxLength={60}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary"
                      maxLength={300}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary !py-1.5 !px-3 text-xs">
                    Save Details
                  </button>
                </div>
              </form>
            )}

            {/* Request List Section (Admin & Co-admin) */}
            <div className="space-y-2.5 border-b pb-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Access Join Requests ({pendingRequests.length})</h4>
              {pendingRequests.length === 0 ? (
                <p className="text-xs text-slate-400">No pending join requests.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="flex justify-between items-center bg-slate-50 border p-2 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{req.user_name}</p>
                        <p className="text-[10px] text-slate-500">{req.user_email}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => resolveRequest(req.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold py-1 px-2.5 rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => resolveRequest(req.id, 'rejected')}
                          className="bg-slate-300 hover:bg-slate-405 text-slate-700 text-[10px] font-semibold py-1 px-2.5 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Member Roles Promotions (Admin & Co-admin "Higher Authority") */}
            <div className="space-y-2.5 border-b pb-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Member Roles: Co-admins ({coAdminCount}/3) · Elders ({elderCount}/7)
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {members.map((m) => (
                  <div key={m.userId} className="flex justify-between items-center bg-slate-50 border p-2 rounded-lg text-xs">
                    <div>
                      <p className="font-bold text-slate-850">{m.name} {m.userId === currentUser?.id && '(You)'}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{m.role.replace('_', ' ')}</p>
                    </div>
                    {m.userId !== currentUser?.id && (
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.userId, e.target.value)}
                        className="rounded border border-slate-200 bg-white p-1 text-[11px]"
                      >
                        <option value="member">Member</option>
                        <option value="elder">Elder</option>
                        {circle?.role === 'admin' && <option value="co_admin">Co-admin</option>}
                        {circle?.role === 'admin' && <option value="admin">Transfer Admin</option>}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings PIN configurations (Admin Only) */}
            {circle?.role === 'admin' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Group PIN Config</h4>
                
                {/* Circle PIN update */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Circle Security PIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234 (leave blank to unlock)"
                      value={adminPinChange}
                      onChange={(e) => setAdminPinChange(e.target.value)}
                      className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button onClick={handleUpdateCirclePin} className="btn-primary !py-1.5 !px-3 text-xs shrink-0">Update PIN</button>
                </div>

                {/* Channel PIN update */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold">Channel-specific PIN locks</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedChannelForPin}
                      onChange={(e) => setSelectedChannelForPin(e.target.value)}
                      className="rounded border border-slate-200 bg-white p-1.5 text-xs w-full"
                    >
                      <option value="">-- Select Channel --</option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>#{ch.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="New Channel PIN"
                      value={selectedChannelPin}
                      onChange={(e) => setSelectedChannelPin(e.target.value)}
                      className="rounded border border-slate-200 p-1.5 text-xs w-full"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleUpdateChannelPin}
                      disabled={!selectedChannelForPin}
                      className="btn-primary !py-1.5 !px-3 text-xs"
                    >
                      Set Channel PIN
                    </button>
                  </div>
                </div>
              </div>
            )}
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
