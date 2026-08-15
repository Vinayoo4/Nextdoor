import React from 'react'

interface LandmarkCreateModalProps {
  showAddBuilding: boolean
  setShowAddBuilding: (val: boolean) => void
  editingBuildingId: string | null
  setEditingBuildingId: (val: string | null) => void
  clearBuildingForm: () => void
  savingBuilding: boolean
  bName: string
  setBName: (val: string) => void
  bType: string
  setBType: (val: any) => void
  bAddress: string
  setBAddress: (val: string) => void
  bTimings: string
  setBTimings: (val: string) => void
  bContact: string
  setBContact: (val: string) => void
  bLat: number
  setBLat: (val: number) => void
  bLng: number
  setBLng: (val: number) => void
  bDescription: string
  setBDescription: (val: string) => void
  bServices: string
  setBServices: (val: string) => void
  handleSaveBuilding: (e: React.FormEvent) => void
}

export default function LandmarkCreateModal({
  showAddBuilding,
  setShowAddBuilding,
  editingBuildingId,
  setEditingBuildingId,
  clearBuildingForm,
  savingBuilding,
  bName,
  setBName,
  bType,
  setBType,
  bAddress,
  setBAddress,
  bTimings,
  setBTimings,
  bContact,
  setBContact,
  bLat,
  setBLat,
  bLng,
  setBLng,
  bDescription,
  setBDescription,
  bServices,
  setBServices,
  handleSaveBuilding,
}: LandmarkCreateModalProps) {
  if (!showAddBuilding) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-150 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150 text-left">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">
              {editingBuildingId ? '⚙️ Edit Landmark details' : '✨ Add New Landmark'}
            </h3>
            <p className="text-[10px] text-slate-500">Provide official landmark name, type, geographical location, and services.</p>
          </div>
          <button
            onClick={() => {
              setShowAddBuilding(false)
              setEditingBuildingId(null)
              clearBuildingForm()
            }}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSaveBuilding} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Name</label>
              <input
                type="text"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Type</label>
              <select
                value={bType}
                onChange={(e) => setBType(e.target.value as any)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800 font-semibold"
                required
              >
                <option value="heritage">Heritage landmark</option>
                <option value="worship">Temple / Worship place</option>
                <option value="transport">Transit terminal / Stand</option>
                <option value="govt">Government department</option>
                <option value="hospital">Hospital / Emergency clinic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Address</label>
            <input
              type="text"
              value={bAddress}
              onChange={(e) => setBAddress(e.target.value)}
              className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Timings / Service Info</label>
              <input
                type="text"
                placeholder="e.g. 9:00 AM - 5:00 PM"
                value={bTimings}
                onChange={(e) => setBTimings(e.target.value)}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Contact Number</label>
              <input
                type="text"
                value={bContact}
                onChange={(e) => setBContact(e.target.value)}
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
                value={bLat}
                onChange={(e) => setBLat(Number(e.target.value))}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={bLng}
                onChange={(e) => setBLng(Number(e.target.value))}
                className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</label>
            <textarea
              value={bDescription}
              onChange={(e) => setBDescription(e.target.value)}
              className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary min-h-16 bg-white text-slate-800"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Services / Features (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Museum, Parking, Restrooms"
              value={bServices}
              onChange={(e) => setBServices(e.target.value)}
              className="w-full rounded border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-primary bg-white text-slate-800"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button
              type="submit"
              disabled={savingBuilding}
              className="flex-1 btn-primary text-xs py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
            >
              {savingBuilding ? 'Saving...' : 'Save Details'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddBuilding(false)
                setEditingBuildingId(null)
                clearBuildingForm()
              }}
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
