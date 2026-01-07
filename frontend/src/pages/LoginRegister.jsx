import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { authApi } from '../api'

export default function LoginRegister() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setUserType = useAuthStore((state) => state.setUserType)
  
  const [isLogin, setIsLogin] = useState(true)
  const [userType, setUserTypeLocal] = useState('individual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    ngoName: ''
  })

  // Persist dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Admin login
      if (userType === 'admin') {
        if (formData.password === 'Checker123') {
          navigate('/admin')
        } else {
          setError('Invalid admin password')
        }
        setLoading(false)
        return
      }

      if (isLogin) {
        const response = await authApi.login({
          userType,
          identifier: formData.email,
          password: formData.password
        })
        const data = response?.data || {}
        setUser({ id: data.userId || 'user_id', name: data.name || formData.name || formData.ngoName || 'User', email: data.email || formData.email })
        setUserType(userType)
        navigate('/dashboard')
      } else {
        await authApi.register({
          userType,
          name: userType === 'individual' ? formData.name : undefined,
          email: formData.email,
          password: formData.password,
          ngoName: userType === 'ngo' ? formData.ngoName : undefined
        })
        setIsLogin(true)
        setError('Registration successful! Please login.')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-b from-slate-900 to-cyan-900' 
        : 'bg-gradient-to-b from-blue-50 to-green-50'
    }`}>
      <div className={`w-full max-w-sm rounded-lg shadow-lg p-6 border ${
        darkMode 
          ? 'bg-slate-800 border-cyan-700' 
          : 'bg-white border-cyan-200'
      }`}>
        {/* Header with dark mode toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💧</span>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`}>LUIT</h1>
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

        {/* Toggle - Hide for admin */}
        {userType !== 'admin' && (
          <div className={`flex gap-2 mb-6 p-1 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => { setIsLogin(true); setError('') }}
              className={`flex-1 py-2 rounded-md font-semibold transition ${
                isLogin 
                  ? darkMode ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setError('') }}
              className={`flex-1 py-2 rounded-md font-semibold transition ${
                !isLogin 
                  ? darkMode ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* User Type Toggle */}
        <div className={`grid grid-cols-3 gap-2 mb-6 p-1 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => setUserTypeLocal('individual')}
            className={`py-2 text-sm rounded-md font-semibold transition ${
              userType === 'individual' 
                ? darkMode ? 'bg-emerald-600 text-white' : 'bg-green-600 text-white'
                : darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setUserTypeLocal('ngo')}
            className={`py-2 text-sm rounded-md font-semibold transition ${
              userType === 'ngo' 
                ? darkMode ? 'bg-emerald-600 text-white' : 'bg-green-600 text-white'
                : darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            NGO
          </button>
          <button
            onClick={() => setUserTypeLocal('admin')}
            className={`py-2 text-sm rounded-md font-semibold transition ${
              userType === 'admin' ? 'bg-red-600 text-white' : darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            error.includes('successful') 
              ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
              : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {userType === 'admin' ? (
            // Admin only needs password
            <input
              type="password"
              name="password"
              placeholder="Admin Password"
              value={formData.password}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                darkMode ? 'bg-slate-700 border-cyan-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          ) : (
            <>
              {!isLogin && userType === 'individual' && (
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode 
                      ? 'bg-slate-700 border-cyan-700 text-white placeholder-gray-400 focus:ring-cyan-600' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-600'
                  }`}
                />
              )}

              {!isLogin && userType === 'ngo' && (
                <input
                  type="text"
                  name="ngoName"
                  placeholder="NGO Name"
                  value={formData.ngoName}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode 
                      ? 'bg-slate-700 border-cyan-700 text-white placeholder-gray-400 focus:ring-cyan-600' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-600'
                  }`}
                />
              )}

              {/* Email for both Login and Register */}
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  darkMode 
                    ? 'bg-slate-700 border-cyan-700 text-white placeholder-gray-400 focus:ring-cyan-600' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-600'
                }`}
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  darkMode 
                    ? 'bg-slate-700 border-cyan-700 text-white placeholder-gray-400 focus:ring-cyan-600' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-600'
                }`}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white font-bold rounded-lg transition ${
              userType === 'admin' 
                ? 'bg-red-600 hover:bg-red-700' 
                : darkMode 
                  ? 'bg-cyan-600 hover:bg-cyan-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
            } disabled:bg-gray-400`}
          >
            {loading ? 'Processing...' : userType === 'admin' ? 'Access Admin Panel' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {/* Back to main */}
        <button
          onClick={() => navigate('/')}
          className={`w-full mt-4 py-2 text-sm transition ${
            darkMode ? 'text-gray-400 hover:text-cyan-300' : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Back to Home
        </button>

        {/* Footer */}
        <div className={`mt-6 pt-4 border-t text-center ${
          darkMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <p className={`text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Made with 💙 by <span className={`font-bold ${
              darkMode ? 'text-cyan-400' : 'text-blue-600'
            }`}>LuitLabs</span>
          </p>
        </div>
      </div>
    </div>
  )
}
