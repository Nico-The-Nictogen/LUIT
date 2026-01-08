import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
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
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [reportsRes, cleaningsRes, usersRes, ngosRes] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/admin/cleanings'),
        api.get('/admin/users'),
        api.get('/admin/ngos')
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
      await api.delete(`/admin/clear/${type}`)
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

  const handleDeleteRow = async (id, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone!`)) {
      return
    }

    setLoading(true)
    try {
      const endpoint = activeTab === 'reports' ? 'report' : activeTab === 'cleanings' ? 'cleaning' : activeTab === 'users' ? 'user' : 'ngo'
      await api.delete(`/admin/delete/${endpoint}/${id}`)
      setMessage(`${type} deleted successfully!`)
      fetchAllData()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      setMessage(`Failed to delete ${type}`)
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

    // Define stable columns per tab to avoid misalignment
    const baseColumns = {
      reports: [
        { key: 'id', label: 'Id' },
        { key: 'imageUrl', label: 'ImageUrl' },
        { key: 'imagePublicId', label: 'ImagePublicId' },
        { key: 'afterImageUrl', label: 'AfterImageUrl' },
        { key: 'afterImagePublicId', label: 'AfterImagePublicId' },
        { key: 'latitude', label: 'Latitude' },
        { key: 'longitude', label: 'Longitude' },
        { key: 'status', label: 'Status' },
        { key: 'verified', label: 'Verified' },
        { key: 'wasteType', label: 'WasteType' },
        { key: 'userId', label: 'UserId' },
        { key: 'userName', label: 'UserName' },
        { key: 'userType', label: 'UserType' },
        { key: 'cleanedBy', label: 'CleanedBy' },
        { key: 'cleanedByName', label: 'CleanedByName' },
        { key: 'createdAt', label: 'CreatedAt' },
        { key: 'cleanedAt', label: 'CleanedAt' }
      ],
      cleanings: [
        { key: 'id', label: 'Id' },
        { key: 'reportId', label: 'ReportId' },
        { key: 'userId', label: 'UserId' },
        { key: 'userName', label: 'UserName' },
        { key: 'userType', label: 'UserType' },
        { key: 'latitude', label: 'Latitude' },
        { key: 'longitude', label: 'Longitude' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'CreatedAt' },
        { key: 'cleanedAt', label: 'CleanedAt' },
        { key: 'afterImageUrl', label: 'AfterImageUrl' },
        { key: 'afterImagePublicId', label: 'AfterImagePublicId' }
      ],
      users: [
        { key: 'id', label: 'Id' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'userType', label: 'UserType' },
        { key: 'reportsCount', label: 'ReportsCount' },
        { key: 'cleaningsCount', label: 'CleaningsCount' },
        { key: 'createdAt', label: 'CreatedAt' }
      ],
      ngos: [
        { key: 'id', label: 'Id' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'userType', label: 'UserType' },
        { key: 'reportsCount', label: 'ReportsCount' },
        { key: 'cleaningsCount', label: 'CleaningsCount' },
        { key: 'createdAt', label: 'CreatedAt' }
      ]
    }

    const columns = baseColumns[activeTab]
    // Append any extra keys to the end for visibility
    const knownKeys = new Set(columns.map(c => c.key))
    const extraKeys = Array.from(new Set(currentData.flatMap(obj => Object.keys(obj)))).filter(k => !knownKeys.has(k))
    const allColumns = columns.concat(extraKeys.map(k => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) })))

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <tr>
              {allColumns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-semibold">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <tr key={index} className={`border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}>
                {allColumns.map((col) => {
                  const value = row[col.key]
                  const text = (typeof value === 'string' ? value : String(value))
                  const display = value === undefined || value === null ? 'null' : (text.length > 50 ? text.substring(0, 50) + '...' : text)
                  return (
                    <td key={col.key} className="px-4 py-3">
                      {display}
                    </td>
                  )
                })}
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDeleteRow(row.id, activeTab.slice(0, -1))}
                    disabled={loading}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs font-semibold rounded transition transform hover:scale-105"
                  >
                    Delete
                  </button>
                </td>
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
            <span className="text-3xl">�</span>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>LUIT Admin</h1>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>🔒 Database Management</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
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
              onClick={() => navigate('/analytics')}
              className={`px-4 py-2 ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-lg text-sm font-medium transition transform hover:scale-105`}
            >
              📊 Analytics
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
          Made with 💙 by <span className={`font-bold ${
            darkMode ? 'text-cyan-400' : 'text-blue-600'
          }`}>LuitLabs</span>
        </p>
      </footer>
    </div>
  )
}
