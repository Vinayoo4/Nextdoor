import React from 'react'

interface BusinessEditModalProps {
  showEditModal: boolean
  setShowEditModal: (val: boolean) => void
  updating: boolean
  editName: string
  setEditName: (val: string) => void
  editCategory: string
  setEditCategory: (val: string) => void
  editAddress: string
  setEditAddress: (val: string) => void
  editDescription: string
  setEditDescription: (val: string) => void
  editPhone: string
  setEditPhone: (val: string) => void
  editWhatsapp: string
  setEditWhatsapp: (val: string) => void
  editLat: number
  setEditLat: (val: number) => void
  editLng: number
  setEditLng: (val: number) => void
  editOwnerId: string
  setEditOwnerId: (val: string) => void
  editVerified: boolean
  setEditVerified: (val: boolean) => void
  editPriority: number
  setEditPriority: (val: number) => void
  handleEditSubmit: (e: React.FormEvent) => void
}

export default function BusinessEditModal({
  showEditModal,
  setShowEditModal,
  updating,
  editName,
  setEditName,
  editCategory,
  setEditCategory,
  editAddress,
  setEditAddress,
  editDescription,
  setEditDescription,
  editPhone,
  setEditPhone,
  editWhatsapp,
  setEditWhatsapp,
  editLat,
  setEditLng, // Wait, setEditLat and setEditLng
  editLng,
  setEditLat,
  editOwnerId,
  setEditOwnerId,
  editVerified,
  setEditVerified,
  editPriority,
  setEditPriority,
  handleEditSubmit,
}: BusinessEditModalProps) {
  if (!showEditModal) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-150 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150 text-left">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">⚙️ Edit Place details</h3>
            <p className="text-[10px] text-slate-500">Edit business, location, verified status and listing priority.</p>
          </div>
          <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">
            ×
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
                required
              >
                <option value="Food">Food</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Govt">Govt</option>
                <option value="Banking">Banking</option>
                <option value="Education">Education</option>
                <option value="Worship">Worship</option>
                <option value="Transport">Transport</option>
                <option value="Shopping">Shopping</option>
                <option value="Services">Services</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Address</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary min-h-14 bg-white text-slate-800"
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">WhatsApp</label>
              <input
                type="text"
                value={editWhatsapp}
                onChange={(e) => setEditWhatsapp(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={editLat}
                onChange={(e) => setEditLat(Number(e.target.value))}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={editLng}
                onChange={(e) => setEditLng(Number(e.target.value))}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Owner User ID</label>
              <input
                type="text"
                value={editOwnerId}
                placeholder="Enter owner user_id"
                onChange={(e) => setEditOwnerId(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-850"
              />
            </div>
            <div className="flex items-center gap-2 pt-4 pl-2">
              <input
                type="checkbox"
                id="editVerified"
                checked={editVerified}
                onChange={(e) => setEditVerified(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-slate-200 rounded cursor-pointer"
              />
              <label htmlFor="editVerified" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                ✓ Verified Place
              </label>
            </div>
          </div>

          {/* Listing Priority Slider */}
          <div className="space-y-1.5 pt-2 border-t">
            <label className="block text-[9px] text-slate-500 font-bold uppercase">Listing Priority Rank ({editPriority})</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={editPriority}
                onChange={(e) => setEditPriority(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700 w-8 text-right">{editPriority}</span>
            </div>
            <p className="text-[9px] text-slate-400">SALTEDHASH and TRI listings are prioritized at 100/90 to always float at the top.</p>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button
              type="submit"
              disabled={updating}
              className="flex-1 btn-primary text-xs py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn btn-outline text-xs py-2 px-4 border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
