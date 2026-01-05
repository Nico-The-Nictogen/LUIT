import React from 'react'

export default function NgoDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">NGO Dashboard</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="grid gap-4">
          <div className="bg-blue-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Reports Created</p>
            <p className="text-3xl font-bold">156</p>
          </div>
          <div className="bg-green-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Cleanups Completed</p>
            <p className="text-3xl font-bold">93</p>
          </div>
          <div className="bg-purple-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Total Points</p>
            <p className="text-3xl font-bold">4850</p>
          </div>
          <div className="bg-orange-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Your Rank</p>
            <p className="text-3xl font-bold">#3</p>
          </div>
        </div>
      </main>
    </div>
  )
}
