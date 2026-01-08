import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'

// Pages
import MainPage from './pages/MainPage'
import LoginRegister from './pages/LoginRegister'
import UserDashboard from './pages/UserDashboard'
import NgoDashboard from './pages/NgoDashboard'
import ReportingPage from './pages/ReportingPage'
import CleanerPage from './pages/CleanerPage'
import CleaningPage from './pages/CleaningPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminDashboard from './pages/AdminDashboard'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  const hydrated = useAuthStore((state) => state.hydrated)

  if (!hydrated) return null

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <MainPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginRegister />} />
        <Route path="/report" element={<ReportingPage />} />

        {/* Protected User Routes */}
        {user && userType === 'individual' && (
          <>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/cleaner" element={<CleanerPage />} />
            <Route path="/cleaning/:reportId" element={<CleaningPage />} />
          </>
        )}

        {/* Protected NGO Routes */}
        {user && userType === 'ngo' && (
          <>
            <Route path="/dashboard" element={<NgoDashboard />} />
            <Route path="/cleaner" element={<CleanerPage />} />
            <Route path="/cleaning/:reportId" element={<CleaningPage />} />
          </>
        )}

        {/* Leaderboard - Public */}
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Admin Route */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
