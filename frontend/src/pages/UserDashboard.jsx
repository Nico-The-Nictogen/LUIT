import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { analyticsApi } from '../api'

export default function UserDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [analytics, setAnalytics] = useState({
    reportsCount: 0,
    cleaningsCount: 0,
    totalPoints: 0,
    userRank: 0
  })
  const [globalAnalytics, setGlobalAnalytics] = useState({
    totalReports: 0,
    totalCleanings: 0
  })
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setShowContent(true)
    if (user?.id) {
      fetchUserAnalytics()
    }
    fetchGlobalAnalytics()
  }, [user])

  // Persist dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const fetchUserAnalytics = async () => {
    try {
      const response = await analyticsApi.getUserAnalytics(user.id)
      setAnalytics(response.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  const fetchGlobalAnalytics = async () => {
    try {
      const response = await analyticsApi.getGlobalAnalytics()
      setGlobalAnalytics({
        totalReports: response.data.totalReports,
        totalCleanings: response.data.totalCleanings
      })
    } catch (error) {
      console.error('Failed to fetch global analytics:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const facts = [
    "The Brahmaputra River supports 150 million people across India and Bangladesh",
    "Every kg of plastic collected from rivers prevents marine life deaths",
    "Brahmaputra cleanup efforts have removed over 50 tons of plastic in 2025",
    "Clean rivers improve water quality for 2 billion people worldwide",
    "River cleanups reduce water pollution by up to 40% in 6 months",
    "The Brahmaputra is the 2nd largest river by discharge volume in the world",
    "Volunteering in river cleanups creates a healthier ecosystem for future generations",
    "Community cleanups inspire 5x more participation in environmental conservation",
    "Protected river ecosystems support fish stocks that feed millions",
    "Clean Brahmaputra means better drinking water for 50+ million people"
  ]

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      darkMode 
        ? 'bg-gradient-to-b from-slate-900 to-slate-800 text-white' 
        : 'bg-gradient-to-b from-blue-50 to-green-50 text-gray-800'
    }`}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-slideDown { animation: slideDown 0.6s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.8s ease-in; }
        .animate-slideUp { animation: slideUp 0.6s ease-out; }
        .animate-slideInScale { animation: slideInScale 0.8s ease-out; }
        .animate-bounce-gentle { animation: bounce-gentle 2s ease-in-out infinite; }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.5s; }
      `}</style>

      {/* Header */}
      <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b shadow-sm sticky top-0 z-40 transition-colors animate-slideDown`}>
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-4xl">💧</span>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LUIT</h1>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Welcome, {user?.name}</p>
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
              onClick={handleLogout}
              className={`px-4 py-2 ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg text-sm font-medium transition transform hover:scale-105`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 max-w-md mx-auto px-4 py-8 w-full ${showContent ? 'animate-fadeIn' : 'opacity-0'}`}>
        {/* Hero Section */}
        <section className={`text-center mb-10 p-8 rounded-2xl ${
          darkMode 
            ? 'bg-gradient-to-br from-slate-900 to-cyan-900' 
            : 'bg-gradient-to-br from-blue-100 via-cyan-100 to-green-100'
        } transition-colors animate-slideUp stagger-1 transform hover:-translate-y-1 hover:shadow-xl`}>
          <h2 className={`text-5xl font-bold mb-4 ${darkMode ? 'text-cyan-300' : 'text-blue-800'} animate-slideInScale`}>
            🌊 Clean Brahmaputra River
          </h2>
          <p className={`text-lg mb-6 ${darkMode ? 'text-cyan-100' : 'text-gray-700'}`}>
            Continue making a difference! Report garbage, participate in cleanups, and protect our river.
          </p>
        </section>

        {/* User Stats */}
        <section className="mb-8">
          <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-cyan-300' : 'text-gray-800'}`}>
            📊 Your Impact
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-blue-50'} transition-colors animate-slideUp stagger-2 transform hover:-translate-y-1 hover:shadow-xl`}>
              <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>{analytics.reportsCount}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reports Created</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-green-50'} transition-colors animate-slideUp stagger-2 transform hover:-translate-y-1 hover:shadow-xl`}>
              <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{analytics.cleaningsCount}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cleanups Done</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-purple-50'} transition-colors animate-slideUp stagger-3 transform hover:-translate-y-1 hover:shadow-xl`}>
              <p className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{analytics.totalPoints}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Points</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-orange-50'} transition-colors animate-slideUp stagger-3 transform hover:-translate-y-1 hover:shadow-xl`}>
              <p className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>#{analytics.userRank || '-'}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your Rank</p>
            </div>
          </div>
        </section>

        {/* Encouraging Facts Section */}
        <section className={`mb-8 animate-slideUp stagger-3`}>
          <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-cyan-300' : 'text-gray-800'}`}>
            ✨ Did You Know?
          </h3>
          <div className={`p-4 rounded-xl mb-4 border ${darkMode ? 'bg-slate-700 border-cyan-700' : 'bg-white border-cyan-100 shadow-md'} transition-colors transform hover:scale-105 hover:shadow-xl`}>
            <p className={`text-lg font-semibold ${darkMode ? 'text-cyan-200' : 'text-cyan-700'}`}>
              {facts[Math.floor(Math.random() * facts.length)]}
            </p>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="grid gap-4 mb-8">
          <button
            onClick={() => navigate('/report')}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 active:scale-95 animate-slideUp stagger-3 ${
              darkMode 
                ? 'bg-gradient-to-r from-sky-700 to-cyan-700 hover:from-sky-800 hover:to-cyan-800' 
                : 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600'
            }`}
          >
            📸 Report Garbage
          </button>
          <button
            onClick={() => navigate('/cleaner')}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 active:scale-95 animate-slideUp stagger-4 ${
              darkMode 
                ? 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
            }`}
          >
            🧹 Join Cleanup
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 active:scale-95 animate-slideUp stagger-4 ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-800 hover:to-cyan-800' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Global Analytics */}
        <section className={`rounded-xl shadow-md p-6 grid grid-cols-2 gap-4 mb-8 ${
          darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-white to-blue-50'
        } transition-colors animate-slideUp stagger-5 transform hover:-translate-y-1 hover:shadow-xl`}>
          <div className="text-center transform hover:scale-110 transition">
            <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>
              {globalAnalytics.totalReports.toLocaleString()}
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Reports</p>
          </div>
          <div className="text-center transform hover:scale-110 transition">
            <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {globalAnalytics.totalCleanings.toLocaleString()}
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Cleanings</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} py-6 text-center transition-colors animate-slideUp`}>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Made with 💙 by <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LuitLabs</span>
        </p>
      </footer>
    </div>
  )
}
