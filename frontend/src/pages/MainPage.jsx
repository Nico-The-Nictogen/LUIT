import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { analyticsApi } from '../api'

export default function MainPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [darkMode, setDarkMode] = useState(false)
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

  const facts = [
    "Every kg of plastic collected prevents marine life deaths",
    "Clean rivers support 2 billion people worldwide",
    "Volunteering creates a healthier ecosystem for future generations",
    "Community cleanups inspire 5x more participation",
    "Cleaning reduces water pollution by up to 40%"
  ]

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      darkMode 
        ? 'bg-gradient-to-b from-slate-900 to-slate-800 text-white' 
        : 'bg-gradient-to-b from-blue-50 to-green-50 text-gray-800'
    }`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b shadow-sm sticky top-0 z-40 transition-colors`}>
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💧</span>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LUIT</h1>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-2 rounded-lg text-lg transition ${
                darkMode 
                  ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-4 py-2 ${darkMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg text-sm font-medium transition`}
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className={`px-4 py-2 ${darkMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg text-sm font-medium transition`}
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
        <section className={`text-center mb-10 p-8 rounded-2xl ${
          darkMode 
            ? 'bg-gradient-to-br from-cyan-900 to-blue-900' 
            : 'bg-gradient-to-br from-blue-100 to-green-100'
        } transition-colors`}>
          <h2 className={`text-5xl font-bold mb-4 ${darkMode ? 'text-cyan-300' : 'text-blue-800'}`}>
            💧 Clean Brahmaputra River
          </h2>
          <p className={`text-lg mb-6 ${darkMode ? 'text-cyan-100' : 'text-gray-700'}`}>
            Join us in cleaning and protecting the Brahmaputra River. Report garbage, participate in cleanups, and make a difference!
          </p>
          <p className={`text-sm italic ${darkMode ? 'text-cyan-200' : 'text-gray-600'}`}>
            Together, we're building a cleaner future for our river and our communities.
          </p>
        </section>

        {/* Join the Movement Button */}
        <button
          onClick={() => navigate('/report')}
          className={`w-full py-5 mb-8 rounded-xl text-white font-bold text-xl transition transform hover:scale-105 active:scale-95 ${
            darkMode 
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700' 
              : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          }`}
        >
          🚀 Join the Movement
        </button>

        {/* Encouraging Facts Section */}
        <section className="mb-8">
          <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-cyan-300' : 'text-gray-800'}`}>
            ✨ Did You Know?
          </h3>
          <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition-colors`}>
            <p className={`text-lg font-semibold ${darkMode ? 'text-cyan-200' : 'text-blue-700'}`}>
              {facts[Math.floor(Math.random() * facts.length)]}
            </p>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="grid gap-4 mb-8">
          <button
            onClick={() => navigate('/report')}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 ${
              darkMode 
                ? 'bg-red-700 hover:bg-red-800' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            📸 Report Garbage
          </button>
          {user && (
            <button
              onClick={() => navigate('/cleaner')}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 ${
                darkMode 
                  ? 'bg-green-700 hover:bg-green-800' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              🧹 Join Cleanup
            </button>
          )}
          <button
            onClick={() => navigate('/leaderboard')}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 ${
              darkMode 
                ? 'bg-purple-700 hover:bg-purple-800' 
                : 'bg-purple-500 hover:bg-purple-600'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Analytics */}
        <section className={`rounded-xl shadow-md p-6 grid grid-cols-2 gap-4 mb-8 ${
          darkMode ? 'bg-slate-700' : 'bg-white'
        } transition-colors`}>
          <div className="text-center">
            <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-600'}`}>
              {analytics.totalReports.toLocaleString()}
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Places Reported</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
              {analytics.totalCleanings.toLocaleString()}
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Places Cleaned</p>
          </div>
        </section>

        {/* Info Section */}
        <section className="mb-12">
          <h3 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-cyan-300' : 'text-gray-800'}`}>
            How It Works
          </h3>
          <div className="space-y-4">
            <div className={`flex gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition-colors`}>
              <div className={`flex-shrink-0 w-10 h-10 ${darkMode ? 'bg-cyan-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center font-bold text-lg`}>1</div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-cyan-200' : 'text-gray-800'}`}>Report Garbage</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Spot garbage? Take a photo and report it to your location</p>
              </div>
            </div>
            <div className={`flex gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition-colors`}>
              <div className={`flex-shrink-0 w-10 h-10 ${darkMode ? 'bg-cyan-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center font-bold text-lg`}>2</div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-cyan-200' : 'text-gray-800'}`}>Join Cleanup</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>See reported areas and volunteer to clean them</p>
              </div>
            </div>
            <div className={`flex gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition-colors`}>
              <div className={`flex-shrink-0 w-10 h-10 ${darkMode ? 'bg-cyan-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center font-bold text-lg`}>3</div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-cyan-200' : 'text-gray-800'}`}>Earn Points</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Get rewarded with points and climb the leaderboard</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} py-6 text-center transition-colors`}>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Made with 💙 by <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LuitLabs</span>
        </p>
      </footer>
    </div>
  )
}
