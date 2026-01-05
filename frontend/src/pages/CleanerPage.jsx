import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { cleaningApi } from '../api'

export default function CleanerPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  
  const [cleanings, setCleanings] = useState([])
  const [selectedTab, setSelectedTab] = useState('plastic')
  const [loading, setLoading] = useState(true)

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Cleanup Areas</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Waste Type Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-4 pb-2 -mx-4 px-4">
          {wasteTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedTab(type)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold transition ${
                selectedTab === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Cleanings List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : cleanings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No cleanup areas available for {selectedTab}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cleanings.map(cleaning => (
              <div
                key={cleaning.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <img
                  src={cleaning.imageUrl}
                  alt="Garbage area"
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{cleaning.wasteType}</p>
                      <p className="text-sm text-gray-600">📍 {cleaning.distance}m away</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{cleaning.points} pts</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/cleaning/${cleaning.id}`)}
                      className="py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm"
                    >
                      Clean
                    </button>
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${cleaning.latitude},${cleaning.longitude}`
                        window.open(url, '_blank')
                      }}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm"
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
    </div>
  )
}
