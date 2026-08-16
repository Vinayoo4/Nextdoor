import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { localDb } from '@/services/localDb'
import { timeAgo } from '@/utils/format'
import { usersApi } from '@/services/api'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  // Notes state
  const [notes, setNotes] = useState<any[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [activeTab, setActiveTab] = useState<'notes' | 'points' | 'activity' | 'backup' | 'edit'>('activity')

  // Edit profile state
  const [editUsername, setEditUsername] = useState(user?.name || '')
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  // Stats state
  const [postsCount, setPostsCount] = useState(0)
  const [notesCount, setNotesCount] = useState(0)
  const [messagesCount, setMessagesCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Status message
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadNotes()
    loadActivityLog()
    if (user?.name) {
      setEditUsername(user.name)
    }
  }, [user])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!editUsername.trim()) return
    setUpdateError('')
    setUpdateSuccess('')
    setUpdateLoading(true)
    try {
      const res = await usersApi.updateProfile(editUsername.trim())
      setUser(res.user)
      setUpdateSuccess('Profile updated successfully!')
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update profile')
    } finally {
      setUpdateLoading(false)
    }
  }

  async function loadNotes() {
    try {
      const list = await localDb.getNotes()
      setNotes(list)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadActivityLog() {
    if (!user) return
    try {
      const myPosts = await localDb.getPosts()
      const myNotes = await localDb.getNotes()
      const myMessages = await localDb.getAllMessages()
      
      const myFilteredPosts = myPosts.filter((p: any) => p.user_id === user.id)
      const myFilteredMessages = myMessages.filter((m: any) => m.user_id === user.id)
      
      setPostsCount(myFilteredPosts.length)
      setNotesCount(myNotes.length)
      setMessagesCount(myFilteredMessages.length)

      const activities: any[] = []
      myFilteredPosts.forEach((p) => {
        activities.push({
          id: p.id,
          type: 'post',
          content: p.content,
          created_at: p.created_at || p.createdAt,
          label: 'Shared in Community Feed 💬'
        })
      })
      myNotes.forEach((n) => {
        activities.push({
          id: n.id,
          type: 'note',
          content: `${n.title}: ${n.content}`,
          created_at: n.created_at,
          label: 'Saved Private Note 📝'
        })
      })
      myFilteredMessages.forEach((m) => {
        activities.push({
          id: m.id,
          type: 'message',
          content: m.content,
          created_at: m.created_at || m.createdAt,
          label: 'Sent Chat Message 👥'
        })
      })

      // Sort desc
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentActivity(activities.slice(0, 10))
    } catch (err) {
      console.error(err)
    }
  }

  function signOut() {
    clear()
    navigate('/login', { replace: true })
  }

  // Export JSON
  async function handleExport() {
    setStatus('')
    setError('')
    try {
      const dataStr = await localDb.exportActivities()
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = 'nextdoor_activities.json'
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      setStatus('Activities JSON exported successfully!')
    } catch (err: any) {
      setError('Export failed: ' + err.message)
    }
  }

  // Import JSON
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setStatus('')
    setError('')
    const fileReader = new FileReader()
    const files = e.target.files
    if (!files || files.length === 0) return

    fileReader.onload = async (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        try {
          await localDb.importActivities(result)
          setStatus('Activities JSON imported and merged successfully!')
          loadNotes()
          loadActivityLog()
        } catch (err: any) {
          setError('Import failed: ' + err.message)
        }
      }
    }
    fileReader.readAsText(files[0])
  }

  // Create Note
  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim()) return
    const newNote = {
      id: Math.random().toString(),
      title: noteTitle.trim() || 'Untitled Note',
      content: noteContent.trim(),
      created_at: new Date().toISOString()
    }
    await localDb.saveNote(newNote)
    setNoteTitle('')
    setNoteContent('')
    loadNotes()
    loadActivityLog()
  }

  // Delete Note
  async function handleDeleteNote(id: string) {
    await localDb.deleteNote(id)
    loadNotes()
    loadActivityLog()
  }

  return (
    <div className="px-4 pt-4 pb-12 space-y-4">
      <h1 className="text-xl font-bold">Profile</h1>

      <div className="card flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-850">{user?.name || 'Guest User'}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="chip mt-1 bg-indigo-50 text-primary capitalize font-semibold">
            {user?.role === 'admin' ? 'Super Admin' : user?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-[10px] font-bold uppercase tracking-wider text-center">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 pb-2.5 ${activeTab === 'activity' ? 'border-b-2 border-primary text-primary font-bold' : 'text-slate-500'}`}
        >
          ⏱️ Stats
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 pb-2.5 ${activeTab === 'notes' ? 'border-b-2 border-primary text-primary font-bold' : 'text-slate-500'}`}
        >
          📝 Notes
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`flex-1 pb-2.5 ${activeTab === 'points' ? 'border-b-2 border-primary text-primary font-bold' : 'text-slate-500'}`}
        >
          🏅 Rewards
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 pb-2.5 ${activeTab === 'backup' ? 'border-b-2 border-primary text-primary font-bold' : 'text-slate-500'}`}
        >
          💾 Backup
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 pb-2.5 ${activeTab === 'edit' ? 'border-b-2 border-primary text-primary font-bold' : 'text-slate-500'}`}
        >
          ✏️ Edit
        </button>
      </div>

      {/* Tab: Activity Contribution Tally & Timeline */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="card text-center bg-slate-50/50 p-2.5 border">
              <span className="text-base">💬</span>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Feed Posts</p>
              <p className="text-lg font-extrabold text-slate-805 mt-0.5">{postsCount}</p>
            </div>
            <div className="card text-center bg-slate-50/50 p-2.5 border">
              <span className="text-base">👥</span>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Messages</p>
              <p className="text-lg font-extrabold text-slate-805 mt-0.5">{messagesCount}</p>
            </div>
            <div className="card text-center bg-slate-50/50 p-2.5 border">
              <span className="text-base">📝</span>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Local Notes</p>
              <p className="text-lg font-extrabold text-slate-805 mt-0.5">{notesCount}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider text-[10px] text-slate-500">Universal Contribution Timeline</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center bg-white border border-dashed rounded-xl">No contribution activity recorded yet.</p>
            ) : (
              <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                {recentActivity.map((act) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary"></span>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{act.label}</span>
                      <p className="text-xs text-slate-700 font-semibold mt-0.5 line-clamp-2 leading-relaxed">{act.content}</p>
                      <span className="text-[9px] text-slate-400">{timeAgo(act.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Private Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateNote} className="card space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Write a Private Note</h3>
            <input
              type="text"
              placeholder="Note Title (Optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="input text-xs"
            />
            <textarea
              placeholder="Type your notes here... (Stored on device only)"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
              className="input text-xs resize-none"
              required
            />
            <button type="submit" className="btn-primary w-full text-xs">
              Save Local Note
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">My Saved Notes ({notes.length})</h3>
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No notes saved on this device yet.</p>
            ) : (
              <div className="space-y-2.5">
                {notes.map((note) => (
                  <div key={note.id} className="card bg-slate-50/50 p-3 space-y-2 border border-slate-205">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-800">{note.title}</h4>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-[10px] text-red-600 font-bold hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-xs text-slate-655 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <p className="text-[9px] text-slate-400 text-right">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Rewards & Points */}
      {activeTab === 'points' && (
        <div className="space-y-4">
          <div className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏅</span>
              <div>
                <p className="text-sm font-bold text-slate-800">Neighborhood Points</p>
                <p className="text-xs text-slate-500">Earn by saving places, reviewing &amp; posting</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold text-accent">{user?.points ?? 0}</p>
          </div>

          <div className="card space-y-1">
            <p className="text-sm font-bold text-slate-700">How to earn points</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-500">
              <li>Save a business → +2 points</li>
              <li>Write a review → +5 points</li>
              <li>Post in the feed → +1 point</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab: Backup/Storage */}
      {activeTab === 'backup' && (
        <div className="card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Manage Activities & Notes Backups</h3>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              All notes, feed posts, and group chat history are stored inside your browser's private database.
              You can export this dataset to a JSON file to transfer to other devices or keep as a backup.
            </p>
          </div>

          {status && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded font-semibold">{status}</p>}
          {error && <p className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded font-semibold">{error}</p>}

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleExport}
              className="btn btn-outline text-xs font-semibold py-2 px-4 rounded w-full flex items-center justify-center gap-1 border-primary text-primary"
            >
              📥 Export Activities JSON
            </button>

            <div className="border-t pt-3.5 space-y-2">
              <label className="block text-xs font-bold text-slate-750">Restore Backup file</label>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-primary hover:file:bg-indigo-100"
              />
              <p className="text-[10px] text-slate-400">Selecting a valid activities backup file merges it with your current local database entries.</p>
            </div>
          </div>
        </div>
      )}
      {/* Tab: Edit Profile */}
      {activeTab === 'edit' && (
        <form onSubmit={handleUpdateProfile} className="card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Edit Profile</h3>
            <p className="text-xs text-slate-500 mt-1">
              Update your display name/username on Nextdoor. Duplicate usernames are not allowed.
            </p>
          </div>

          {updateSuccess && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded font-semibold">{updateSuccess}</p>}
          {updateError && <p className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded font-semibold">{updateError}</p>}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">Username</label>
            <input
              type="text"
              placeholder="Username"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="input text-xs"
              required
            />
          </div>

          <button type="submit" disabled={updateLoading} className="btn-primary w-full text-xs">
            {updateLoading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      )}

      <div className="space-y-2 pt-2">
        {user?.role === 'admin' && (
          <Link
            to="/authority"
            className="btn-outline border-red-250 hover:bg-red-55/20 flex items-center justify-between w-full text-left text-sm font-semibold p-3 text-red-700 rounded-xl"
          >
            <span>🚨 Civic Authority Portal (Admin)</span>
            <span className="text-red-400 font-bold">→</span>
          </Link>
        )}

        <button onClick={signOut} className="btn-danger w-full mt-4">
          Sign Out
        </button>
      </div>
    </div>
  )
}
