import React from 'react'

interface CirclePasscodeGateProps {
  circle: any
  circlePinInput: string
  setCirclePinInput: (val: string) => void
  circlePinError: string
  isMember: boolean
  isCircleUnlockedForSession: boolean
  handleJoinCircleWithPin: (e: React.FormEvent) => void
  handleVerifyCirclePin: (e: React.FormEvent) => void
  handleRequestCircleAccess: () => void
  navigate: (path: string) => void
}

export default function CirclePasscodeGate({
  circle,
  circlePinInput,
  setCirclePinInput,
  circlePinError,
  isMember,
  isCircleUnlockedForSession,
  handleJoinCircleWithPin,
  handleVerifyCirclePin,
  handleRequestCircleAccess,
  navigate,
}: CirclePasscodeGateProps) {
  // CASE 1: User is NOT a member (Join Access Gate)
  if (!isMember) {
    return (
      <div className="px-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔒</span>
            <h2 className="text-lg font-extrabold text-slate-800">Private Circle Channel</h2>
            <p className="text-xs text-slate-500">
              <b>{circle?.name}</b> is private. Enter the passcode/PIN code to join, or submit a request to the group owners.
            </p>
            {circle?.pin && (
              <p className="text-xs font-semibold text-primary mt-2 bg-primary/5 p-2 rounded-lg border border-primary/10 font-mono">
                🔑 Super Admin Code: {circle.pin}
              </p>
            )}
          </div>

          <form onSubmit={handleJoinCircleWithPin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Circle Pin Code</label>
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
  if (circle?.hasPin && !isCircleUnlockedForSession) {
    return (
      <div className="px-4 pt-10 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔑</span>
            <h2 className="text-lg font-extrabold text-slate-800">Enter Group Passkey</h2>
            <p className="text-xs text-slate-500">
              For security, you must input the number passkey to enter <b>{circle.name}</b>.
            </p>
            {circle?.pin && (
              <p className="text-xs font-semibold text-primary mt-2 bg-primary/5 p-2 rounded-lg border border-primary/10 font-mono">
                🔑 Super Admin Code: {circle.pin}
              </p>
            )}
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

  return null
}
