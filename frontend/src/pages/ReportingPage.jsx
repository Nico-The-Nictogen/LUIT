import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocationStore, useAuthStore } from '../store'
import { reportingApi, locationApi } from '../api'

export default function ReportingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  const setLocation = useLocationStore((state) => state.setLocation)
  const { latitude, longitude } = useLocationStore()
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [wasteType, setWasteType] = useState('plastic')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationConflict, setLocationConflict] = useState(null)
  const [verification, setVerification] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null)
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)
  const streamRef = useRef(null)
  const [cameraKey, setCameraKey] = useState(0)

  // Get location on mount
  useEffect(() => {
    getLocation()
    
    // Cleanup: stop camera on unmount
    return () => {
      stopCamera()
    }
  }, [])

  // Persist dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  // Refresh location every 30 seconds
  useEffect(() => {
    const interval = setInterval(getLocation, 30000)
    return () => clearInterval(interval)
  }, [])

  const getLocation = () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setLocation(latitude, longitude, position.coords.accuracy)
          setError('')
          
          // Check for nearby active reports within 100m
          try {
            const checkResult = await locationApi.checkDuplicateLocation(latitude, longitude)
            if (checkResult.data.is_duplicate) {
              // Validate nearby reports exist to avoid showing deleted/stale entries
              const rawNearby = checkResult.data.nearby_reports || []
              const validated = []
              for (const item of rawNearby) {
                try {
                  const res = await reportingApi.getReport(item.id)
                  const report = res.data?.report
                  if (report && report.imageUrl && report.status === 'active') {
                    validated.push(item)
                  }
                } catch (_) {
                  // Ignore 404/missing
                }
              }

              if (validated.length > 0) {
                console.warn('⚠️ Location conflict detected (validated):', validated)
                const closest = validated.reduce((min, r) => (r.distance < min ? r.distance : min), validated[0].distance)
                setLocationConflict({
                  isDuplicate: true,
                  nearbyReports: validated,
                  closestDistance: closest,
                  message: `Location already reported ${closest}m away`
                })
                setError(`❌ ${validated.length} active report(s) within 100m`)
              } else {
                setLocationConflict(null)
                setError('')
                console.log('✅ Location is clear after validation')
              }
            } else {
              setLocationConflict(null)
              console.log('✅ Location is clear')
            }
          } catch (err) {
            console.warn('Could not check location conflict:', err)
            setLocationConflict(null)
          }
          
          setLocationLoading(false)
        },
        (err) => {
          setError('Failed to get location. Please enable GPS.')
          setLocationConflict(null)
          setLocationLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setError('Geolocation not supported')
      setLocationConflict(null)
      setLocationLoading(false)
    }
  }

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    } catch (_) {}
    setCameraActive(false)
  }

  const startCamera = async () => {
    try {
      setError('')
      // Ensure any previous stream is stopped before starting a new one
      stopCamera()
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
          const p = videoRef.current.play()
          if (p && typeof p.then === 'function') {
            p.catch(() => {})
          }
          setCameraActive(true)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
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
      
      let imageData = canvas.toDataURL('image/jpeg', 0.7)
      
      let quality = 0.7
      while (imageData.length > 1000000 && quality > 0.3) {
        quality -= 0.1
        imageData = canvas.toDataURL('image/jpeg', quality)
      }
      
      console.log(`📷 Image captured: ${(imageData.length / 1024).toFixed(2)} KB`)

      setImage(imageData)
      // Turn off camera immediately after capture to free device
      stopCamera()
      setCameraStarted(false)
      setError('')
      setVerifying(true)
      setVerification(null)

      // Step 1: Verify image (AI)
      try {
        console.log('🔍 Verifying image...')
        const verifyResult = await reportingApi.verifyImage(imageData)
        console.log('✅ Verification result:', verifyResult.data)
        setVerification(verifyResult.data)

        if (!verifyResult.data.is_garbage) {
          setError(verifyResult.data.message || 'No garbage detected')
          setVerifying(false)
          return
        }
      } catch (verifyErr) {
        console.error('❌ Verification error:', verifyErr)
        setError('Error verifying image: ' + (verifyErr.response?.data?.detail || verifyErr.message))
        setVerification(null)
        setVerifying(false)
        return
      }

      // Step 2: Upload image to Cloudinary
      try {
        console.log('📤 Uploading image to Cloudinary...')
        console.log('Base64 length:', imageData.length)
        console.log('First 100 chars:', imageData.substring(0, 100))
        
        const uploadResult = await reportingApi.uploadImage(imageData)
        console.log('✅ Upload successful:', uploadResult.data)
        
        setCloudinaryUrl(uploadResult.data.url)
        setCloudinaryPublicId(uploadResult.data.public_id)
      } catch (uploadErr) {
        console.error('❌ Upload error:', uploadErr)
        console.error('Error response:', uploadErr.response?.data)
        setError('Error uploading image: ' + (uploadErr.response?.data?.detail || uploadErr.message))
        setVerification(null)
        setCloudinaryUrl(null)
        setCloudinaryPublicId(null)
      }
      
      setVerifying(false)
    } catch (err) {
      console.error('❌ Capture error:', err)
      setError('Failed to capture image. Please try again.')
    }
  }

  const handleSubmit = async () => {
    if (locationConflict?.isDuplicate) {
      setError(`❌ Cannot report here. Location already reported ${locationConflict.closestDistance}m away`)
      return
    }
    if (!image) {
      setError('Please capture an image')
      return
    }
    if (!verification?.is_garbage) {
      setError('Image must be verified as garbage before reporting')
      return
    }
    if (!cloudinaryUrl) {
      setError('Image not uploaded. Please try again.')
      return
    }
    if (!latitude || !longitude) {
      setError('Location not available')
      return
    }

    setLoading(true)
    try {
      // Create report with Cloudinary URL
      const report = await reportingApi.createReport({
        latitude,
        longitude,
        wasteType,
        imageBase64: cloudinaryUrl,
        userId: user?.id,
        userName: user?.name || 'Anonymous',
        userType: userType || 'individual'
      })

      setSuccess('Report submitted successfully! You earned 10 points.')
      setImage(null)
      setVerification(null)
      setCloudinaryUrl(null)
      setCloudinaryPublicId(null)
      setTimeout(() => {
        if (!user) navigate('/login')
        else navigate('/')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report')
    } finally {
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
                darkMode ? 'text-cyan-400' : 'text-blue-600'
              }`}>LUIT</h1>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Report Garbage</p>
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
              onClick={() => navigate('/')}
              className={`text-2xl ${
                darkMode ? 'text-gray-400 hover:text-cyan-300' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-4 py-6 w-full">
        {/* Location Status */}
        <div className={`p-4 rounded-lg mb-4 border-2 transition ${
          locationConflict?.isDuplicate 
            ? darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-400'
            : darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-sm mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>📍 Your Location</p>
          {locationLoading ? (
            <p className={`text-sm font-semibold ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>Getting location...</p>
          ) : latitude && longitude ? (
            <>
              <p className={`text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
              {locationConflict?.isDuplicate && (
                <p className={`text-sm font-semibold mt-2 ${
                  darkMode ? 'text-red-300' : 'text-red-600'
                }`}>
                  ⚠️ {locationConflict.message}
                </p>
              )}
            </>
          ) : (
            <p className={`text-sm ${
              darkMode ? 'text-red-300' : 'text-red-600'
            }`}>Location unavailable</p>
          )}
          <button
            onClick={getLocation}
            className={`mt-2 text-xs font-semibold hover:opacity-80 ${
              locationConflict?.isDuplicate
                ? darkMode ? 'text-red-300' : 'text-red-600'
                : darkMode ? 'text-cyan-300' : 'text-blue-600'
            }`}
          >
            Refresh Location
          </button>
        </div>

        {/* Error/Success */}
        {error && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`}>{error}</div>
        )}
        {success && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
          }`}>{success}</div>
        )}

        {!user && (
          <div className={`border p-4 rounded-lg mb-4 ${
            darkMode ? 'bg-yellow-900 border-yellow-700 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <p className="text-sm">
              💡 <strong>Tip:</strong> Log in to earn points and get recognized on the leaderboard!
            </p>
          </div>
        )}

        {/* Waste Type Selection */}
        <div className="mb-6">
          <label className={`block text-sm font-semibold mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-800'
          }`}>Waste Type</label>
          <select
            value={wasteType}
            onChange={(e) => setWasteType(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              darkMode 
                ? 'bg-slate-700 border-cyan-700 text-white focus:ring-cyan-600' 
                : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-600'
            }`}
          >
            <option value="plastic">🔵 Plastic Waste</option>
            <option value="organic">🟢 Organic Waste</option>
            <option value="mixed">🟡 Mixed Waste</option>
            <option value="toxic">🔴 Toxic/Hazardous Waste</option>
            <option value="sewage">⚫ Untreated Sewage Point</option>
          </select>
        </div>

        {/* Camera Section */}
        {!image ? (
          <div>
            {!cameraStarted ? (
              <div className="space-y-4">
                <div className={`border p-6 rounded-lg text-center ${
                  darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-lg font-semibold mb-2 ${
                    darkMode ? 'text-cyan-300' : 'text-blue-800'
                  }`}>📷 Ready to Capture?</p>
                  <p className={`text-sm mb-4 ${
                    darkMode ? 'text-gray-400' : 'text-blue-600'
                  }`}>Click the button below to open your camera</p>
                </div>
                <button
                  onClick={() => {
                    setCameraStarted(true)
                    startCamera()
                  }}
                  className={`w-full py-3 text-white font-bold rounded-lg text-lg ${
                    darkMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  📱 Open Camera
                </button>
              </div>
            ) : (
              <div>
                {!cameraActive && (
                  <div className={`border p-4 rounded-lg mb-4 text-center ${
                    darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className={`text-sm ${
                      darkMode ? 'text-yellow-200' : 'text-yellow-700'
                    }`}>📷 Requesting camera access...</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full bg-black rounded-lg mb-4"
                  style={{ 
                    maxHeight: '400px', 
                    objectFit: 'cover',
                    transform: 'scaleX(-1)'
                  }}
                  key={cameraKey}
                />
                <button
                  onClick={captureImage}
                  disabled={!cameraActive}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg"
                >
                  📸 {cameraActive ? 'Capture Image' : 'Camera Loading...'}
                </button>
                <button
                  onClick={() => {
                    stopCamera()
                    setCameraStarted(false)
                  }}
                  className="w-full mt-2 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg text-sm"
                >
                  ❌ Close Camera
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <img
              src={image}
              alt="Captured"
              className="w-full rounded-lg mb-4 max-h-96 object-contain"
            />

            {/* Verification Result */}
            {verifying && (
              <div className={`border p-4 rounded-lg mb-4 text-center ${
                darkMode ? 'bg-slate-800 border-cyan-700' : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm font-semibold ${
                  darkMode ? 'text-cyan-300' : 'text-blue-700'
                }`}>🔍 Verifying image...</p>
              </div>
            )}

            {verification && (
              <div className={`border p-4 rounded-lg mb-4 ${
                verification.is_garbage 
                  ? darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'
                  : darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-semibold mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-800'
                }`}>
                  {verification.is_garbage ? '✅ Garbage detected' : '❌ No garbage detected'}
                </p>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-700'
                }`}>{verification.message}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  if (cloudinaryPublicId) {
                    try {
                      await reportingApi.deleteImage(cloudinaryPublicId)
                    } catch (err) {
                      console.error('Failed to delete:', err)
                    }
                  }
                  setImage(null)
                  setVerification(null)
                  setCloudinaryUrl(null)
                  setCloudinaryPublicId(null)
                  setVerifying(false)
                  // Restart camera cleanly for retake
                  setCameraStarted(true)
                  setCameraKey((k) => k + 1)
                  startCamera()
                }}
                className="py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg"
              >
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !cloudinaryUrl || !verification?.is_garbage || locationConflict?.isDuplicate}
                className="py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
              >
                {locationConflict?.isDuplicate ? '❌ Location conflict' : loading ? 'Submitting...' : verification?.is_garbage ? 'Report' : 'Verify image first'}
              </button>
            </div>
          </div>
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
