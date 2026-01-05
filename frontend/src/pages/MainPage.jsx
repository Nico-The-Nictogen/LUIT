import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { analyticsApi } from '../api'

export default function MainPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [analytics, setAnalytics] = useState({
    totalReports: 0,
    totalCleanings: 0
  })

  useEffect(() => {
    fetchGlobalAnalytics()
  }, [])

  const fetchGlobalAnalytics = async () => {
    try {
      const response = await analyticsApi.getGlobalAnalytics()
      setAnalytics({
        totalReports: response.data.totalReports,
        totalCleanings: response.data.totalCleanings
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">LUIT</h1>
          <div className="flex gap-2">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto px-4 py-8 w-full">
        {/* Hero Section */}
        <section className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Clean Brahmaputra River</h2>
          <p className="text-lg text-gray-600 mb-6">
            Join us in cleaning and protecting the Brahmaputra River. Report garbage, participate in cleanups, and make a difference!
          </p>
        </section>

        {/* Action Buttons */}
        <div className="grid gap-4 mb-8">
          <button
            onClick={() => navigate('/report')}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-lg transition"
          >
            Report Garbage
          </button>
          {user && (
            <button
              onClick={() => navigate('/cleaner')}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-lg transition"
            >
              Join Cleanup
            </button>
          )}
          <button
            onClick={() => navigate('/leaderboard')}
            className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-lg transition"
          >
            Leaderboard
          </button>
        </div>

        {/* Analytics */}
        <section className="bg-white rounded-lg shadow-md p-6 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{analytics.totalReports.toLocaleString()}</p>
            <p className="text-gray-600 text-sm">Places Reported</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{analytics.totalCleanings.toLocaleString()}</p>
            <p className="text-gray-600 text-sm">Places Cleaned</p>
          </div>
        </section>

        {/* Info Section */}
        <section className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
              <div>
                <p className="font-semibold text-gray-800">Report Garbage</p>
                <p className="text-sm text-gray-600">Spot garbage? Take a photo and report it to your location</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <div>
                <p className="font-semibold text-gray-800">Join Cleanup</p>
                <p className="text-sm text-gray-600">See reported areas and volunteer to clean them</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <div>
                <p className="font-semibold text-gray-800">Earn Points</p>
                <p className="text-sm text-gray-600">Get rewarded with points and climb the leaderboard</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
