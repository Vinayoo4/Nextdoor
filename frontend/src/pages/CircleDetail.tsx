import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { circlesApi, messagesApi } from '@/services/api'
import { localDb } from '@/services/localDb'
import { useAuthStore } from '@/stores/auth'
import { Spinner, ErrorBox } from '@/components/UI'
import UserLink from '@/components/UserLink'
import { timeAgo } from '@/utils/format'
import CirclePasscodeGate from '@/components/circle/CirclePasscodeGate'
import ManageMembersModal from '@/components/circle/ManageMembersModal'

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
        
        // If the user is not a member, stop loading here so the Join / Request Gate (CASE 1) displays.
        if (!res.circle.isMember) {
          setLoading(false)
          return
        }
        
        const isSystemAdmin = res.circle.role === 'admin' && useAuthStore.getState().user?.role === 'admin'
        if (!res.circle.hasPin || isCircleUnlockedForSession || isSystemAdmin) {
          if (isSystemAdmin) {
            setIsCircleUnlockedForSession(true)
          }
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

  async function handleDeleteMessage(messageId: string) {
    if (!activeId) return
    if (!window.confirm('Delete this message?')) return
    try {
      await circlesApi.deleteMessage(activeId, messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete message')
    }
  }

  async function handleDeleteCircle() {
    if (!id) return
    if (!window.confirm('WARNING: Are you absolutely sure you want to permanently delete this circle? This action cannot be undone.')) return
    try {
      await circlesApi.deleteCircle(id)
      alert('Circle deleted successfully!')
      setShowManageModal(false)
      window.location.href = '/circles'
    } catch (err: any) {
      setMgmtError(err.message || 'Failed to delete circle')
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
    if (!id || !newChannel.trim() || !newChannelPin.trim()) return
    try {
      const res = await circlesApi.createChannel(id, newChannel.trim(), newChannelPin.trim())
      setChannels((c) => [...c, res.channel])
      setNewChannel('')
      setNewChannelPin('')
      setActiveId(res.channel.id)
    } catch (err: any) {
      alert(err.message || 'Failed to create channel')
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

  // CASE 1 & CASE 2: PIN passcode entry gates
  if ((circle && !circle.isMember) || (circle && circle.hasPin && !isCircleUnlockedForSession)) {
    return (
      <CirclePasscodeGate
        circle={circle}
        circlePinInput={circlePinInput}
        setCirclePinInput={setCirclePinInput}
        circlePinError={circlePinError}
        isMember={circle.isMember}
        isCircleUnlockedForSession={isCircleUnlockedForSession}
        handleJoinCircleWithPin={handleVerifyCirclePin}
        handleVerifyCirclePin={handleVerifyCirclePin}
        handleRequestCircleAccess={handleRequestCircleAccess}
        navigate={navigate}
      />
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
              className="input !w-20 !px-1.5 !py-0.5 !text-[11px]"
              placeholder="PIN *"
              value={newChannelPin}
              onChange={(e) => setNewChannelPin(e.target.value)}
              maxLength={20}
              required
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
                    <p className="text-xs font-bold text-slate-700">
                      <UserLink userId={m.user_id || m.userId} name={m.author_name || m.authorName} />
                    </p>
                    <div className="flex items-center gap-1">
                      {m.expires_at && (
                        <span className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0" title="Disappearing message">
                          ⏱️ {getExpiresInLabel(m.expires_at)}
                        </span>
                      )}
                      {(currentUser?.role === 'admin' || m.user_id === currentUser?.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-slate-400 hover:text-red-500 text-[10px] font-bold p-0.5"
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-800 leading-normal">{m.content}</p>
                  <p className="mt-0.5 text-right text-[10px] text-slate-400">{timeAgo(m.created_at || m.createdAt)}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No messages yet — say hello!</p>
            )}
          </div>

          <form onSubmit={send} className="mt-3 flex gap-2 items-center">

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



      <ManageMembersModal
        showManageModal={showManageModal}
        setShowManageModal={setShowManageModal}
        circle={circle}
        currentUser={currentUser}
        editName={editName}
        setEditName={setEditName}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        mgmtSuccess={mgmtSuccess}
        setMgmtSuccess={setMgmtSuccess}
        mgmtError={mgmtError}
        setMgmtError={setMgmtError}
        pendingRequests={pendingRequests}
        members={members}
        coAdminCount={coAdminCount}
        elderCount={elderCount}
        adminPinChange={adminPinChange}
        setAdminPinChange={setAdminPinChange}
        selectedChannelForPin={selectedChannelForPin}
        setSelectedChannelForPin={setSelectedChannelForPin}
        selectedChannelPin={selectedChannelPin}
        setSelectedChannelPin={setSelectedChannelPin}
        channels={channels}
        handleUpdateCircleDetails={handleUpdateCircleDetails}
        resolveRequest={resolveRequest}
        handleUpdateRole={handleUpdateRole}
        handleUpdateCirclePin={handleUpdateCirclePin}
        handleUpdateChannelPin={handleUpdateChannelPin}
        handleDeleteCircle={handleDeleteCircle}
      />
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
