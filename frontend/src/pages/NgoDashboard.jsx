import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'

export default function NgoDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      darkMode 
        ? 'bg-gradient-to-b from-slate-900 to-cyan-900' 
        : 'bg-gradient-to-b from-blue-50 to-green-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-sm'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💧</span>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LUIT</h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>NGO Dashboard</p>
            </div>
          </div>
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
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Welcome Section */}
        <section className={`mb-8 p-6 rounded-xl border ${
          darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-md'
        }`}>
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-cyan-300' : 'text-gray-800'}`}>
            Welcome, {user?.name || 'NGO'}!
          </h2>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Track your environmental impact and manage cleanup operations
          </p>
        </section>

        {/* Stats Grid */}
        <section className="grid md:grid-cols-4 gap-4 mb-8">
          <div className={`p-6 rounded-xl border transition transform hover:scale-105 ${
            darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-md'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reports Created</p>
            <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-600'}`}>156</p>
          </div>
          <div className={`p-6 rounded-xl border transition transform hover:scale-105 ${
            darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-md'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cleanups Completed</p>
            <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>93</p>
          </div>
          <div className={`p-6 rounded-xl border transition transform hover:scale-105 ${
            darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-md'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Points</p>
            <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-600'}`}>4850</p>
          </div>
          <div className={`p-6 rounded-xl border transition transform hover:scale-105 ${
            darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-md'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your Rank</p>
            <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>#3</p>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/report')}
            className={`p-6 rounded-xl border text-left transition transform hover:scale-105 ${
              darkMode 
                ? 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-700' 
                : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
            }`}
          >
            <div className="text-3xl mb-2">📍</div>
            <h3 className="text-xl font-bold mb-1">Report Garbage</h3>
            <p className="text-sm opacity-90">Submit new garbage location</p>
          </button>
          <button
            onClick={() => navigate('/cleanup')}
            className={`p-6 rounded-xl border text-left transition transform hover:scale-105 ${
              darkMode 
                ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700' 
                : 'bg-green-600 border-green-500 text-white hover:bg-green-700'
            }`}
          >
            <div className="text-3xl mb-2">🧹</div>
            <h3 className="text-xl font-bold mb-1">Join Cleanup</h3>
            <p className="text-sm opacity-90">Find nearby cleanup tasks</p>
          </button>
        </section>

        {/* Additional Actions */}
        <section className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/leaderboard')}
            className={`p-4 rounded-xl border text-center transition transform hover:scale-105 ${
              darkMode 
                ? 'bg-slate-800 border-cyan-700 text-cyan-300 hover:bg-slate-700' 
                : 'bg-white border-cyan-200 text-blue-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl mr-2">🏆</span>
            <span className="font-semibold">Leaderboard</span>
          </button>
          <button
            onClick={handleLogout}
            className={`p-4 rounded-xl border text-center transition transform hover:scale-105 ${
              darkMode 
                ? 'bg-slate-800 border-red-700 text-red-300 hover:bg-slate-700' 
                : 'bg-white border-red-200 text-red-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl mr-2">🚪</span>
            <span className="font-semibold">Logout</span>
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t mt-12 py-6 text-center transition-colors ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
      }`}>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Made with 💙 by <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LuitLabs</span>
        </p>
      </footer>
    </div>
  )
}
