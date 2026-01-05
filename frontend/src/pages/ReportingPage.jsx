import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocationStore, useAuthStore } from '../store'
import { reportingApi, locationApi } from '../api'

export default function ReportingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const setLocation = useLocationStore((state) => state.setLocation)
  const { latitude, longitude } = useLocationStore()
  
  const [wasteType, setWasteType] = useState('plastic')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
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

  // Get location on mount
  useEffect(() => {
    getLocation()
    
    // Cleanup: stop camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Refresh location every 30 seconds
  useEffect(() => {
    const interval = setInterval(getLocation, 30000)
    return () => clearInterval(interval)
  }, [])

  const getLocation = () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation(latitude, longitude, position.coords.accuracy)
          setLocationLoading(false)
          setError('')
        },
        (err) => {
          setError('Failed to get location. Please enable GPS.')
          setLocationLoading(false)
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
      // Check for duplicate location
      const locationCheck = await locationApi.getNearbyReports(latitude, longitude, 100)
      if (locationCheck.data && locationCheck.data.length > 0) {
        setError('This location already reported. Please try another area.')
        setLoading(false)
        return
      }

      // Create report with Cloudinary URL
      const report = await reportingApi.createReport({
        latitude,
        longitude,
        wasteType,
        imageBase64: cloudinaryUrl,
        userId: user?.id
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Report Garbage</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Location Status */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-2">📍 Your Location</p>
          {locationLoading ? (
            <p className="text-sm font-semibold text-gray-700">Getting location...</p>
          ) : latitude && longitude ? (
            <p className="text-sm font-semibold text-gray-700">{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
          ) : (
            <p className="text-sm text-red-600">Location unavailable</p>
          )}
          <button
            onClick={getLocation}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            Refresh Location
          </button>
        </div>

        {/* Error/Success */}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tip:</strong> Log in to earn points and get recognized on the leaderboard!
            </p>
          </div>
        )}

        {/* Waste Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Waste Type</label>
          <select
            value={wasteType}
            onChange={(e) => setWasteType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
                  <p className="text-lg font-semibold text-blue-800 mb-2">📷 Ready to Capture?</p>
                  <p className="text-sm text-blue-600 mb-4">Click the button below to open your camera</p>
                </div>
                <button
                  onClick={() => {
                    setCameraStarted(true)
                    startCamera()
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-lg"
                >
                  📱 Open Camera
                </button>
              </div>
            ) : (
              <div>
                {!cameraActive && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 text-center">
                    <p className="text-sm text-yellow-700">📷 Requesting camera access...</p>
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
                    setCameraStarted(false)
                    if (streamRef.current) {
                      streamRef.current.getTracks().forEach(track => track.stop())
                    }
                    setCameraActive(false)
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
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-center">
                <p className="text-sm text-blue-700 font-semibold">🔍 Verifying image...</p>
              </div>
            )}

            {verification && (
              <div className={`border p-4 rounded-lg mb-4 ${
                verification.is_garbage ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  {verification.is_garbage ? '✅ Garbage detected' : '❌ No garbage detected'}
                </p>
                <p className="text-sm text-gray-700">{verification.message}</p>
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
                }}
                className="py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg"
              >
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !cloudinaryUrl || !verification?.is_garbage}
                className="py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
              >
                {loading ? 'Submitting...' : verification?.is_garbage ? 'Report' : 'Verify image first'}
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </main>
    </div>
  )
}
