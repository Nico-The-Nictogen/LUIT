import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store'
import { analyticsApi } from '../api'

export default function UserDashboard() {
  const user = useAuthStore((state) => state.user)
  const [analytics, setAnalytics] = useState({
    reportsCount: 0,
    cleaningsCount: 0,
    totalPoints: 0,
    userRank: 0
  })

  useEffect(() => {
    if (user?.id) {
      fetchUserAnalytics()
    }
  }, [user])

  const fetchUserAnalytics = async () => {
    try {
      const response = await analyticsApi.getUserAnalytics(user.id)
      setAnalytics(response.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="grid gap-4">
          <div className="bg-blue-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Reports Created</p>
            <p className="text-3xl font-bold">{analytics.reportsCount}</p>
          </div>
          <div className="bg-green-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Cleanups Participated</p>
            <p className="text-3xl font-bold">{analytics.cleaningsCount}</p>
          </div>
          <div className="bg-purple-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Total Points</p>
            <p className="text-3xl font-bold">{analytics.totalPoints}</p>
          </div>
          <div className="bg-orange-600 text-white p-6 rounded-lg">
            <p className="text-sm opacity-80">Your Rank</p>
            <p className="text-3xl font-bold">#{analytics.userRank || '-'}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
