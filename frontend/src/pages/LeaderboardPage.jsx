import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsApi } from '../api'
import { useAuthStore } from '../store'

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  
  // Auto-select category based on userType, default to 'users' for non-logged in
  const initialCategory = userType === 'ngo' ? 'ngos' : 'users'
  const [category, setCategory] = useState(initialCategory)
  const [type, setType] = useState('reporting') // reporting, cleaning
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">Leaderboard</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Category Toggle - Only show for non-logged-in users */}
        {!user && (
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCategory('users')}
              className={`flex-1 py-2 rounded-md font-semibold transition ${
                category === 'users' ? 'bg-purple-600 text-white' : 'text-gray-600'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setCategory('ngos')}
              className={`flex-1 py-2 rounded-md font-semibold transition ${
                category === 'ngos' ? 'bg-purple-600 text-white' : 'text-gray-600'
              }`}
            >
              NGOs
            </button>
          </div>
        )}
        
        {/* Show current category for logged-in users */}
        {user && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600">
              Viewing {category === 'users' ? 'User' : 'NGO'} Leaderboard
            </p>
          </div>
        )}

        {/* Type Tabs */}
        <div className="flex gap-2 mb-4">
          {['reporting', 'cleaning'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                type === t
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No data available</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  index === 0
                    ? 'bg-yellow-50 border-2 border-yellow-400'
                    : index === 1
                    ? 'bg-gray-50 border-2 border-gray-400'
                    : index === 2
                    ? 'bg-orange-50 border-2 border-orange-400'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="w-8 h-8 flex-shrink-0">
                  {index === 0 && <span className="text-2xl">🥇</span>}
                  {index === 1 && <span className="text-2xl">🥈</span>}
                  {index === 2 && <span className="text-2xl">🥉</span>}
                  {index > 2 && <span className="font-bold text-lg text-gray-600">#{index + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{entry.name}</p>
                  <p className="text-sm text-gray-600">{entry.city || 'Anonymous'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-purple-600">{entry.points}</p>
                  <p className="text-xs text-gray-600">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
