import axios from 'axios'

// Use environment variable or default to Railway production URL
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://web-production-1a99b.up.railway.app'
  : 'http://localhost:5000'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000  // 30 second timeout for large image uploads
})

// Add request interceptor
api.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Add response interceptor
api.interceptors.response.use(
  response => {
    return response
  },
  error => {
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout')
}

// Reporting endpoints
export const reportingApi = {
  uploadImage: (imageBase64) => api.post('/reporting/upload-image', { image_base64: imageBase64 }),
  verifyImage: (imageBase64) => api.post('/reporting/verify-image', { image_base64: imageBase64 }),
  deleteImage: (public_id) => api.post('/reporting/delete-image', { public_id }),
  checkLocation: (latitude, longitude) => api.post('/reporting/check-location', { latitude, longitude }),
  createReport: (data) => api.post('/reporting/report', data),
  getReports: (wasteType, limit) => api.get('/reporting/reports', { 
    params: { wasteType, limit } 
  }),
  getReport: (reportId) => api.get(`/reporting/reports/${reportId}`)
}

// Cleaning endpoints
export const cleaningApi = {
  verifyCleaning: (data) => api.post('/cleaning/verify', data),
  markCleaned: (data) => api.post('/cleaning/mark-cleaned', data),
  getAvailableCleanings: (wasteType, userType) => api.get('/cleaning/available', {
    params: { wasteType, userType }
  })
}

// Analytics endpoints
export const analyticsApi = {
  getUserAnalytics: (userId) => api.get(`/analytics/user/${userId}`),
  getNgoAnalytics: (ngoId) => api.get(`/analytics/ngo/${ngoId}`),
  getGlobalAnalytics: () => api.get('/analytics/global'),
  getTimeBuckets: () => api.get('/analytics/time-buckets'),
  getUsersLeaderboard: (category = 'overall', limit = 20) => 
    api.get('/analytics/leaderboard/users', { params: { category, limit } }),
  getNgosLeaderboard: (category = 'overall', limit = 20) => 
    api.get('/analytics/leaderboard/ngos', { params: { category, limit } })
}

// Location endpoints
export const locationApi = {
  getNearbyReports: (latitude, longitude, radius = 100) => 
    api.get('/location/nearby-reports', { params: { latitude, longitude, radius } }),
  validateCoordinates: (latitude, longitude) => 
    api.get('/location/validate-coordinates', { params: { latitude, longitude } }),
  checkDuplicateLocation: (latitude, longitude, radius = 100) => 
    api.post('/location/check-duplicate', { latitude, longitude, radius })
}
