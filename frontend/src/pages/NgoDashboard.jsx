import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { analyticsApi } from '../api'

export default function NgoDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [analytics, setAnalytics] = useState({
    reportsCount: 0,
    cleaningsCount: 0,
    totalPoints: 0,
    ngoRank: 0
  })
  const [globalAnalytics, setGlobalAnalytics] = useState({
    totalReports: 0,
    totalCleanings: 0
  })
  const [loading, setLoading] = useState(false)
  const [showContent, setShowContent] = useState(false)
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    setShowContent(true)
    if (user?.id) {
      fetchAnalytics(user.id)
    }
    fetchGlobal()
  }, [user])

  const fetchAnalytics = async (ngoId) => {
    try {
      setLoading(true)
      const res = await analyticsApi.getNgoAnalytics(ngoId)
      setAnalytics({
        reportsCount: res.data?.reportsCount || 0,
        cleaningsCount: res.data?.cleaningsCount || 0,
        totalPoints: res.data?.totalPoints || 0,
        ngoRank: 0
      })
      
      // Fetch overall leaderboard to get NGO's rank
      try {
        const leaderboardRes = await analyticsApi.getNgosLeaderboard('overall')
        const leaderboard = leaderboardRes.data.leaderboard || []
        const ngoRankIndex = leaderboard.findIndex(entry => entry.id === ngoId)
        const ngoRank = ngoRankIndex !== -1 ? ngoRankIndex + 1 : '-'
        
        setAnalytics(prev => ({ ...prev, ngoRank }))
      } catch (err) {
        console.error('Failed to fetch NGO rank:', err)
      }
    } catch (err) {
      console.error('Failed to fetch NGO analytics', err.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGlobal = async () => {
    try {
      const res = await analyticsApi.getGlobalAnalytics()
      setGlobalAnalytics({
        totalReports: res.data?.totalReports || 0,
        totalCleanings: res.data?.totalCleanings || 0
      })
    } catch (err) {
      console.error('Failed to fetch global analytics', err.response?.data || err.message)
    }
  }

  

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

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Hero */}
        <section className={`relative overflow-hidden rounded-2xl border p-8 transition-all duration-500 ${
          darkMode ? 'bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-900 border-cyan-800' : 'bg-gradient-to-br from-blue-50 via-white to-green-50 border-cyan-200 shadow-lg'
        } ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <p className={`${darkMode ? 'text-cyan-300' : 'text-blue-600'} font-semibold text-sm uppercase tracking-wide`}>NGO Command</p>
              <h2 className={`text-3xl md:text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Welcome, {user?.name || user?.ngoName || 'NGO Team'}
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-lg`}>
                Coordinate reports, mobilize volunteers, and track your river impact in real time.
              </p>
              {loading && (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Loading your stats...</p>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => navigate('/report')}
                  className={`${darkMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} px-4 py-2 rounded-lg font-semibold shadow transition transform hover:-translate-y-0.5`}
                >
                  Report Garbage
                </button>
                <button
                  onClick={() => navigate('/cleaner')}
                  className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'} px-4 py-2 rounded-lg font-semibold shadow transition transform hover:-translate-y-0.5`}
                >
                  Join Cleanup
                </button>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className={`${darkMode ? 'bg-slate-800 border border-cyan-700 text-cyan-200 hover:bg-slate-700' : 'bg-white border border-cyan-200 text-blue-700 hover:bg-gray-50'} px-4 py-2 rounded-lg font-semibold shadow-sm transition transform hover:-translate-y-0.5`}
                >
                  View Leaderboard
                </button>
              </div>
            </div>
            <div className={`grid grid-cols-2 gap-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {[{ label: 'Reports Created', value: analytics.reportsCount, accent: 'text-cyan-300' },
                { label: 'Cleanups Led', value: analytics.cleaningsCount, accent: 'text-emerald-300' },
                { label: 'Points Earned', value: analytics.totalPoints, accent: 'text-cyan-100' },
                { label: 'Current Rank', value: `#${analytics.ngoRank || 0}`, accent: 'text-emerald-200' }]
                .map((item) => (
                  <div
                    key={item.label}
                    className={`p-4 rounded-xl border ${darkMode ? 'border-white/10 bg-white/5' : 'border-cyan-100 bg-white/80 backdrop-blur'}`}
                  >
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</p>
                    <p className={`text-3xl font-bold ${darkMode ? item.accent : 'text-blue-700'}`}>
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </p>
                  </div>
                ))}
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" aria-hidden />
        </section>

        

        {/* Impact cards */}
        <section className={`grid md:grid-cols-4 gap-4 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-500`}>
          {[{
            title: 'Reports Filed',
            value: analytics.reportsCount,
            desc: 'Hotspots flagged by your team',
            icon: '📍'
          }, {
            title: 'Cleanups Completed',
            value: analytics.cleaningsCount,
            desc: 'Operations you led',
            icon: '🧹'
          }, {
            title: 'Total Points',
            value: analytics.totalPoints,
            desc: 'Impact points earned',
            icon: '✨'
          }, {
            title: 'Leaderboard Rank',
            value: `#${analytics.ngoRank || 0}`,
            desc: 'Position among NGOs',
            icon: '🏆'
          }].map((card) => (
            <div
              key={card.title}
              className={`p-6 rounded-xl border transition transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-slate-800 border-cyan-700 text-white' : 'bg-white border-cyan-200 text-slate-900 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{card.title}</p>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-2`}>{card.desc}</p>
            </div>
          ))}
        </section>

        {/* Global impact */}
        <section className={`rounded-2xl border p-6 transition-all duration-500 ${
          darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-white border-cyan-200 shadow-md'
        } ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={`${darkMode ? 'text-cyan-300' : 'text-blue-600'} font-semibold text-sm uppercase tracking-wide`}>Riverwide Progress</p>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Combined community impact</h3>
            </div>
            <span className="text-2xl">🌍</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-700/70 border-cyan-700 text-white' : 'bg-cyan-50 border-cyan-200 text-slate-900'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Reports Logged</p>
              <p className={`text-3xl font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                {globalAnalytics.totalReports.toLocaleString()}
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>Across all volunteers and NGOs</p>
            </div>
            <div className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-700/70 border-cyan-700 text-white' : 'bg-emerald-50 border-emerald-200 text-slate-900'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Cleanups Completed</p>
              <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {globalAnalytics.totalCleanings.toLocaleString()}
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>Riverbank operations finished</p>
            </div>
          </div>
        </section>

        {/* Session actions */}
        <section className={`flex flex-wrap gap-4 justify-between items-center ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-500`}>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/cleaner')}
              className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'} px-5 py-3 rounded-xl font-semibold shadow transition transform hover:-translate-y-0.5`}
            >
              Start a Cleanup
            </button>
            <button
              onClick={() => navigate('/report')}
              className={`${darkMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} px-5 py-3 rounded-xl font-semibold shadow transition transform hover:-translate-y-0.5`}
            >
              Log a Report
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className={`${darkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'} px-5 py-3 rounded-xl font-semibold shadow transition transform hover:-translate-y-0.5`}
            >
              📊 Analytics
            </button>
          </div>
          <button
            onClick={handleLogout}
            className={`${darkMode ? 'bg-slate-800 border border-red-700 text-red-300 hover:bg-slate-700' : 'bg-white border border-red-200 text-red-600 hover:bg-gray-50'} px-5 py-3 rounded-xl font-semibold shadow-sm transition transform hover:-translate-y-0.5`}
          >
            Logout
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
