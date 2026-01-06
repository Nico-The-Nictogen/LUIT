import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState('reports')
  const [data, setData] = useState({
    reports: [],
    cleanings: [],
    users: [],
    ngos: []
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [reportsRes, cleaningsRes, usersRes, ngosRes] = await Promise.all([
        axios.get(`${API_URL}/admin/reports`),
        axios.get(`${API_URL}/admin/cleanings`),
        axios.get(`${API_URL}/admin/users`),
        axios.get(`${API_URL}/admin/ngos`)
      ])
      
      setData({
        reports: reportsRes.data || [],
        cleanings: cleaningsRes.data || [],
        users: usersRes.data || [],
        ngos: ngosRes.data || []
      })
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
      setMessage('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleClearDatabase = async (type) => {
    if (!confirm(`Are you sure you want to clear all ${type}? This action cannot be undone!`)) {
      return
    }

    setLoading(true)
    try {
      await axios.delete(`${API_URL}/admin/clear/${type}`)
      setMessage(`${type} cleared successfully!`)
      fetchAllData()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(`Failed to clear ${type}:`, error)
      setMessage(`Failed to clear ${type}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const renderTable = () => {
    const currentData = data[activeTab]
    
    if (!currentData || currentData.length === 0) {
      return <div className="text-center py-8 text-gray-500">No data available</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <tr>
              {Object.keys(currentData[0]).map((key) => (
                <th key={key} className="px-4 py-3 text-left font-semibold">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <tr key={index} className={`border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                {Object.values(row).map((value, i) => (
                  <td key={i} className="px-4 py-3">
                    {typeof value === 'string' && value.length > 50 
                      ? value.substring(0, 50) + '...' 
                      : String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      darkMode 
        ? 'bg-gradient-to-b from-slate-900 to-slate-800 text-white' 
        : 'bg-gradient-to-b from-red-50 to-orange-50 text-gray-800'
    }`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b shadow-sm sticky top-0 z-40 transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Admin Panel</h1>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Database Management</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-2 rounded-lg text-lg transition transform hover:scale-110 ${
                darkMode 
                  ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/')}
              className={`px-4 py-2 ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-sm font-medium transition transform hover:scale-105`}
            >
              Exit Admin
            </button>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`max-w-7xl mx-auto w-full px-4 mt-4`}>
          <div className={`p-4 rounded-lg ${message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Stats Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition hover:scale-105`}>
            <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>{data.reports.length}</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reports</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition hover:scale-105`}>
            <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{data.cleanings.length}</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cleanings</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition hover:scale-105`}>
            <p className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{data.users.length}</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Users</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} transition hover:scale-105`}>
            <p className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>{data.ngos.length}</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>NGOs</p>
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {['reports', 'cleanings', 'users', 'ngos'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105 ${
                  activeTab === tab
                    ? darkMode 
                      ? 'bg-red-600 text-white' 
                      : 'bg-red-500 text-white'
                    : darkMode 
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={() => handleClearDatabase(activeTab)}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-bold text-white transition transform hover:scale-105 ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'Processing...' : `Clear All ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          </button>
        </div>

        {/* Data Table */}
        <div className={`rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-white shadow-md'} overflow-hidden`}>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            renderTable()
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} py-6 text-center transition-colors`}>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          🔐 Admin Panel - Handle with care
        </p>
      </footer>
    </div>
  )
}
