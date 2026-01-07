import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocationStore, useAuthStore } from '../store'
import { cleaningApi, reportingApi } from '../api'

// Haversine distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + 
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Returns distance in meters
}

export default function CleaningPage() {
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  const setLocation = useLocationStore((state) => state.setLocation)
  const { latitude, longitude } = useLocationStore()
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [beforeImage, setBeforeImage] = useState(null)
  const [beforeImageBase64, setBeforeImageBase64] = useState(null)
  const [afterImage, setAfterImage] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [distance, setDistance] = useState(null)
  const [isWithinRange, setIsWithinRange] = useState(false)
  const [verification, setVerification] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)
  const streamRef = useRef(null)

  // Load report and get location on mount
  useEffect(() => {
    fetchReport()
    getLocation()
    
    // Cleanup: stop camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Persist dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  // Recalculate distance when report loads or location changes
  useEffect(() => {
    if (report?.latitude && report?.longitude && latitude && longitude) {
      const dist = calculateDistance(
        latitude,
        longitude,
        report.latitude,
        report.longitude
      )
      setDistance(dist)
      
      const withinRange = dist <= 50
      setIsWithinRange(withinRange)
      
      console.log(`📍 Distance to cleanup: ${dist.toFixed(1)}m - ${withinRange ? '✅ In range' : '❌ Out of range'}`)
      
      if (!withinRange) {
        setError(`⚠️ You are ${dist.toFixed(0)}m away. Get closer to the location (within 50m) to start cleaning.`)
      }
    }
  }, [report, latitude, longitude])

  const fetchReport = async () => {
    try {
      const response = await reportingApi.getReport(reportId)
      const reportData = response.data.report || response.data
      setReport(reportData)
      setBeforeImage(reportData.imageUrl)
      
      // Convert image URL to base64
      try {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const base64 = canvas.toDataURL('image/jpeg', 0.8)
          setBeforeImageBase64(base64)
          console.log('✅ Before image converted to base64')
        }
        img.onerror = () => {
          console.warn('⚠️ Could not load image for conversion, will use URL')
          setBeforeImageBase64(reportData.imageUrl)
        }
        img.src = reportData.imageUrl
      } catch (err) {
        console.warn('⚠️ Could not convert image to base64:', err)
        setBeforeImageBase64(reportData.imageUrl)
      }
    } catch (err) {
      console.error('Failed to load report:', err)
      setError('Could not load cleanup task')
    }
  }

  const getLocation = () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: userLat, longitude: userLon } = position.coords
          setLocation(userLat, userLon, position.coords.accuracy)
          setLocationLoading(false)
          setError('')
          console.log(`📍 Location obtained: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}`)
        },
        (err) => {
          setError('Failed to get location. Please enable GPS.')
          setLocationLoading(false)
          console.error('Geolocation error:', err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setError('Geolocation not supported')
      setLocationLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      setError('')
      
      // Check if within 50m range
      if (!isWithinRange) {
        setError(`❌ You must be within 50m of the cleanup location. Currently ${distance?.toFixed(0)}m away. Please move closer to proceed.`)
        setCameraStarted(false)
        return
      }
      
      setCameraStarted(true)
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setCameraActive(true)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraStarted(false)
      if (err.name === 'NotAllowedError') {
        setError('❌ Camera permission denied. Please allow camera access in your browser settings.')
      } else if (err.name === 'NotFoundError') {
        setError('❌ No camera found on this device.')
      } else if (err.name === 'NotReadableError') {
        setError('❌ Camera is being used by another app.')
      } else {
        setError('❌ Cannot access camera. ' + err.message)
      }
      setCameraActive(false)
    }
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready. Please wait...')
      return
    }
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (canvas.width === 0 || canvas.height === 0) {
        setError('Camera not fully loaded. Please try again.')
        return
      }
      
      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      let imageData = canvas.toDataURL('image/jpeg', 0.8)
      
      let quality = 0.8
      while (imageData.length > 1000000 && quality > 0.3) {
        quality -= 0.1
        imageData = canvas.toDataURL('image/jpeg', quality)
      }
      
      console.log(`📷 After image captured: ${(imageData.length / 1024).toFixed(2)} KB`)
      
      setAfterImage(imageData)
      setError('')
      setVerifying(true)
      setVerification(null)

      // Verify by comparing before and after images
      try {
        console.log('🔍 Verifying cleanup...')
        const verifyResult = await cleaningApi.verifyCleaning({
          reportId,
          beforeImageBase64: beforeImageBase64 || beforeImage,
          afterImageBase64: imageData,
          userId: user?.id,
          userName: user?.name || 'Anonymous',
          userType
        })
        console.log('✅ Verification result:', verifyResult.data)
        setVerification(verifyResult.data)

        if (!verifyResult.data.is_cleaned) {
          setError(verifyResult.data.message || 'Area does not appear to be cleaned')
          setVerifying(false)
          setAfterImage(null)
          return
        }
      } catch (verifyErr) {
        console.error('❌ Verification error:', verifyErr)
        setError('Error verifying cleanup: ' + (verifyErr.response?.data?.detail || verifyErr.message))
        setVerification(null)
        setVerifying(false)
        setAfterImage(null)
        return
      }
      
      setVerifying(false)
    } catch (err) {
      console.error('❌ Capture error:', err)
      setError('Failed to capture image. Please try again.')
    }
  }

  const handleSubmit = async () => {
    if (!afterImage) {
      setError('Please capture an after image')
      return
    }
    if (!verification?.is_cleaned) {
      setError('Image must be verified as cleaned before submitting')
      return
    }
    if (loading) {
      console.warn('⚠️ Submission already in progress')
      return
    }

    setLoading(true)
    try {
      console.log('📤 Marking area as cleaned...')
      const result = await cleaningApi.markCleaned({
        reportId,
        beforeImageBase64: beforeImageBase64 || beforeImage,
        afterImageBase64: afterImage,
        userId: user?.id,
        userName: user?.name || 'Anonymous',
        userType
      })
      console.log('✅ Success:', result.data)
      navigate('/cleaner')
    } catch (err) {
      console.error('❌ Submit error:', err)
      setError('Error submitting cleanup: ' + (err.response?.data?.detail || err.message))
      setLoading(false)
    }
  }

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
              }`}>🧹 Cleanup</p>
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
              onClick={() => navigate('/cleaner')}
              className={`text-2xl ${
                darkMode ? 'text-gray-400 hover:text-cyan-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-4 py-6 pb-12 w-full">
        {error && (
          <div className={`border p-4 rounded-lg mb-4 ${
            darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {!beforeImage ? (
          <div className="text-center py-12">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading cleanup task...</p>
          </div>
        ) : (
          <>
            {/* Before Image */}
            <div className={`rounded-xl p-4 mb-6 overflow-hidden border ${
              darkMode ? 'bg-slate-800 border-cyan-700 shadow-lg' : 'bg-white border-cyan-200 shadow-md'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📸</span>
                <h2 className={`font-bold ${
                  darkMode ? 'text-gray-300' : 'text-gray-800'
                }`}>Before Photo</h2>
              </div>
              <img
                src={beforeImage}
                alt="Before"
                className={`w-full rounded-lg object-cover border-2 ${
                  darkMode ? 'border-cyan-700' : 'border-blue-200'
                }`}
                style={{ maxHeight: '300px' }}
              />
              <p className={`text-sm mt-3 text-center ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Original report</p>
            </div>

            {/* Instructions */}
            <div className={`border rounded-xl p-4 mb-6 ${
              darkMode ? 'bg-emerald-900 border-emerald-700' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧹</span>
                <div>
                  <p className={`font-semibold ${
                    darkMode ? 'text-emerald-200' : 'text-gray-800'
                  }`}>Clean this area</p>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-emerald-300' : 'text-gray-600'
                  }`}>Take a photo after cleaning to verify</p>
                </div>
              </div>
            </div>

            {/* Distance Information */}
            <div className={`rounded-xl p-4 mb-6 border ${
              darkMode ? 'bg-slate-800 border-cyan-700 shadow-lg' : 'bg-white border-cyan-200 shadow-md'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📍</span>
                  <h3 className={`font-semibold ${
                    darkMode ? 'text-gray-300' : 'text-gray-800'
                  }`}>Location</h3>
                </div>
                {distance !== null && (
                  <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                    isWithinRange 
                      ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                      : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                  }`}>
                    {isWithinRange ? '✅' : '❌'} {distance.toFixed(1)}m
                  </div>
                )}
              </div>
              {locationLoading && (
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Getting your location...</p>
              )}
              {!locationLoading && distance !== null && (
                <div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {isWithinRange 
                      ? `✅ You are within range to start cleaning (${distance.toFixed(1)}m away)`
                      : `⚠️ You must get closer to the cleanup location. Currently ${distance.toFixed(0)}m away - need to be within 50m`
                    }
                  </p>
                  {!isWithinRange && (
                    <button
                      onClick={getLocation}
                      className={`mt-3 w-full py-2 font-semibold rounded-lg text-sm ${
                        darkMode 
                          ? 'bg-cyan-900 hover:bg-cyan-800 text-cyan-200' 
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      }`}
                    >
                      🔄 Refresh Location
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Camera Section */}
            <div className={`rounded-xl p-4 mb-6 border ${
              darkMode ? 'bg-slate-800 border-cyan-700 shadow-lg' : 'bg-white border-cyan-200 shadow-md'
            }`}>
              {!cameraStarted && (
                <button
                  onClick={startCamera}
                  disabled={!isWithinRange || locationLoading}
                  className={`w-full py-4 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-lg ${
                    darkMode
                      ? 'bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
                  } disabled:cursor-not-allowed`}
                >
                  <span>📷</span> {locationLoading ? 'Getting Location...' : 'Open Camera'}
                </button>
              )}

              {cameraStarted && (
                <div>
                  <p className={`text-sm text-center mb-3 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Position the cleaned area</p>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full bg-black rounded-lg mb-4 border-2 ${
                      darkMode ? 'border-cyan-700' : 'border-gray-300'
                    }`}
                    style={{ maxHeight: '400px', objectFit: 'cover' }}
                  />
                  {!cameraActive && (
                    <p className={`text-center py-2 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Initializing camera...</p>
                  )}
                  {cameraActive && !afterImage && (
                    <button
                      onClick={captureImage}
                      disabled={verifying}
                      className={`w-full py-4 text-white font-bold rounded-lg text-lg flex items-center justify-center gap-2 ${
                        darkMode
                          ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700'
                          : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                      }`}
                    >
                      <span>📸</span> {verifying ? 'Verifying...' : 'Take After Photo'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Verification Result */}
            {verification && (
              <div className={`rounded-xl p-4 mb-6 border ${
                darkMode ? 'bg-slate-800 border-cyan-700 shadow-lg' : 'bg-white border-cyan-200 shadow-md'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{verification.is_cleaned ? '✅' : '❌'}</span>
                  <div>
                    <p className={`font-bold ${
                      darkMode ? 'text-gray-300' : 'text-gray-800'
                    }`}>{verification.is_cleaned ? 'Cleanup Verified!' : 'Not Cleaned'}</p>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{verification.message}</p>
                  </div>
                </div>

                {verification.is_cleaned && afterImage && (
                  <div className="mb-4">
                    <h3 className={`font-bold mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-800'
                    }`}>After Photo</h3>
                    <img
                      src={afterImage}
                      alt="After"
                      className="w-full rounded-lg object-cover"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}

                {verification.is_cleaned && (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full py-4 text-white font-bold rounded-lg text-lg ${
                      darkMode
                        ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700'
                        : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                    }`}
                  >
                    {loading ? '⏳ Submitting...' : '✅ Confirm Cleanup'}
                  </button>
                )}

                {!verification.is_cleaned && (
                  <button
                    onClick={() => {
                      setAfterImage(null)
                      setVerification(null)
                      setCameraActive(false)
                      setCameraStarted(false)
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop())
                      }
                    }}
                    className={`w-full py-4 text-white font-bold rounded-lg text-lg ${
                      darkMode ? 'bg-slate-600 hover:bg-slate-700' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
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
