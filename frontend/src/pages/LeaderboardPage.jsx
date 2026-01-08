import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsApi } from '../api'
import { useAuthStore } from '../store'

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  
  // Auto-select category based on userType, default to 'users' for non-logged in
  const initialCategory = userType === 'ngo' ? 'ngos' : 'users'
  const [category, setCategory] = useState(initialCategory)
  const [type, setType] = useState('overall') // overall, reporting, cleaning
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Persist dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])
  
  // Update category when userType changes
  useEffect(() => {
    if (userType === 'ngo') {
      setCategory('ngos')
    } else if (userType === 'individual') {
      setCategory('users')
    }
  }, [userType])

  useEffect(() => {
    fetchLeaderboard()
  }, [category, type])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      let response
      if (category === 'users') {
        response = await analyticsApi.getUsersLeaderboard(type)
      } else {
        response = await analyticsApi.getNgosLeaderboard(type)
      }
      setLeaderboard(response.data.leaderboard || [])
    } catch (err) {
      console.error('Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      darkMode 
        ? 'bg-gradient-to-b from-slate-900 to-cyan-900' 
        : 'bg-gradient-to-b from-blue-50 to-green-50'
    }`}>
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-sm'
      }`}>
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💧</span>
            <div>
              <h1 className={`text-2xl font-bold ${
                darkMode ? 'text-cyan-400' : 'text-purple-600'
              }`}>LUIT</h1>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>🏆 Leaderboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-2 py-1 rounded-md text-sm transition transform hover:scale-110 ${
                darkMode 
                  ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/')}
              className={`text-2xl ${
                darkMode ? 'text-gray-400 hover:text-cyan-300' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-4 py-4 w-full">
        {/* Category Toggle - Only show for non-logged-in users */}
        {!user && (
          <div className={`flex gap-2 mb-4 p-1 rounded-lg ${
            darkMode ? 'bg-slate-700' : 'bg-gray-100'
          }`}>
            <button
              onClick={() => setCategory('users')}
              className={`flex-1 py-2 rounded-md font-semibold transition ${
                category === 'users' 
                  ? darkMode ? 'bg-cyan-600 text-white' : 'bg-purple-600 text-white'
                  : darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setCategory('ngos')}
              className={`flex-1 py-2 rounded-md font-semibold transition ${
                category === 'ngos' 
                  ? darkMode ? 'bg-cyan-600 text-white' : 'bg-purple-600 text-white'
                  : darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              NGOs
            </button>
          </div>
        )}
        
        {/* Show current category for logged-in users */}
        {user && (
          <div className="mb-4 text-center">
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Viewing {category === 'users' ? 'User' : 'NGO'} Leaderboard
            </p>
          </div>
        )}

        {/* Type Tabs */}
        <div className="flex gap-2 mb-4">
          {['overall', 'reporting', 'cleaning'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                type === t
                  ? darkMode ? 'bg-cyan-600 text-white' : 'bg-purple-600 text-white'
                  : darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="text-center py-8">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No data available</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition transform hover:scale-105 ${
                  index === 0
                    ? darkMode 
                      ? 'bg-yellow-900 border-yellow-600' 
                      : 'bg-yellow-50 border-yellow-400'
                    : index === 1
                    ? darkMode 
                      ? 'bg-slate-700 border-gray-500' 
                      : 'bg-gray-50 border-gray-400'
                    : index === 2
                    ? darkMode 
                      ? 'bg-orange-900 border-orange-600' 
                      : 'bg-orange-50 border-orange-400'
                    : darkMode 
                      ? 'bg-slate-800 border-cyan-700' 
                      : 'bg-white border-gray-200'
                }`}
              >
                <div className="w-8 h-8 flex-shrink-0">
                  {index === 0 && <span className="text-2xl">🥇</span>}
                  {index === 1 && <span className="text-2xl">🥈</span>}
                  {index === 2 && <span className="text-2xl">🥉</span>}
                  {index > 2 && (
                    <span className={`font-bold text-lg ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>#{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${
                    darkMode ? 'text-gray-300' : 'text-gray-800'
                  }`}>{entry.name}</p>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{entry.city || 'Anonymous'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${
                    darkMode ? 'text-cyan-300' : 'text-purple-600'
                  }`}>{entry.points}</p>
                  <p className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t mt-12 py-6 text-center transition-colors ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
      }`}>
        <p className={`text-sm ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Made with 💙 by <span className={`font-bold ${
            darkMode ? 'text-cyan-400' : 'text-blue-600'
          }`}>LuitLabs</span>
        </p>
      </footer>
    </div>
  )
}
