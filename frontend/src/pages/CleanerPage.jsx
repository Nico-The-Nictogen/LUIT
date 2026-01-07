import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { cleaningApi } from '../api'

export default function CleanerPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [cleanings, setCleanings] = useState([])
  const [selectedTab, setSelectedTab] = useState('plastic')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    fetchCleanings()
  }, [selectedTab])

  const fetchCleanings = async () => {
    setLoading(true)
    try {
      const response = await cleaningApi.getAvailableCleanings(selectedTab, userType)
      console.log('Cleanings response:', response.data)
      setCleanings(response.data.cleanings || [])
      if (!response.data.cleanings || response.data.cleanings.length === 0) {
        console.log('No cleanings found for wasteType:', selectedTab)
      }
    } catch (err) {
      console.error('Failed to fetch cleanings:', err.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }

  const wasteTypes = ['plastic', 'organic', 'mixed', 'toxic']
  if (userType === 'ngo') wasteTypes.push('sewage')

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
                darkMode ? 'text-emerald-400' : 'text-green-600'
              }`}>LUIT</h1>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Cleanup Areas</p>
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
        {/* Waste Type Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-4 pb-2 -mx-4 px-4">
          {wasteTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedTab(type)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold transition ${
                selectedTab === type
                  ? darkMode ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                  : darkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Cleanings List */}
        {loading ? (
          <div className="text-center py-8">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
          </div>
        ) : cleanings.length === 0 ? (
          <div className="text-center py-8">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No cleanup areas available for {selectedTab}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cleanings.map(cleaning => (
              <div
                key={cleaning.id}
                className={`rounded-lg overflow-hidden transition transform hover:scale-105 border ${
                  darkMode ? 'bg-slate-800 border-cyan-700 shadow-lg' : 'bg-white border-cyan-200 shadow-md hover:shadow-lg'
                }`}
              >
                <img
                  src={cleaning.imageUrl}
                  alt="Garbage area"
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className={`font-semibold ${
                        darkMode ? 'text-gray-300' : 'text-gray-800'
                      }`}>{cleaning.wasteType}</p>
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>📍 {cleaning.distance}m away</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        darkMode ? 'text-emerald-300' : 'text-green-600'
                      }`}>{cleaning.points} pts</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/cleaning/${cleaning.id}`)}
                      className={`py-2 text-white font-semibold rounded-lg text-sm ${
                        darkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Clean
                    </button>
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${cleaning.latitude},${cleaning.longitude}`
                        window.open(url, '_blank')
                      }}
                      className={`py-2 text-white font-semibold rounded-lg text-sm ${
                        darkMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Navigate
                    </button>
                  </div>
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
