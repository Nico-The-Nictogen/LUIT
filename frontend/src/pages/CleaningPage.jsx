import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocationStore, useAuthStore } from '../store'
import { cleaningApi, locationApi, reportingApi } from '../api'

export default function CleaningPage() {
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  const setLocation = useLocationStore((state) => state.setLocation)
  const { latitude, longitude } = useLocationStore()
  
  const [stage, setStage] = useState('loading') // loading -> location -> after -> verify
  const [beforeImage, setBeforeImage] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    fetchReport()
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const fetchReport = async () => {
    try {
      console.log('🔍 Fetching report:', reportId)
      const response = await reportingApi.getReport(reportId)
      console.log('📦 Full response:', response)
      console.log('📋 Response data:', response.data)
      
      // Handle both response formats
      const reportData = response.data.report || response.data
      console.log('✅ Report data extracted:', reportData)
      
      if (!reportData) {
        throw new Error('No report data received')
      }
      
      setReport(reportData)
      setBeforeImage(reportData.imageUrl)
      console.log('📸 Image set:', reportData.imageUrl)
      getLocation()
    } catch (err) {
      console.error('❌ Failed to load report:', err)
      setError('Could not load the cleanup task')
      setStage('error')
    }
  }

  const getLocation = () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation(latitude, longitude, position.coords.accuracy)
          setLocationLoading(false)
          setError('')
          setStage('after')
        },
        (err) => {
          setError('Could not get your location. Please enable GPS.')
          setLocationLoading(false)
          setStage('location_error')
        }
      )
    }
  }

  const startCamera = async () => {
    try {
      setError('')
      console.log('📷 Starting camera...')
      setStreamStarted(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      console.log('✅ Stream obtained:', stream)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log('✅ Stream attached to video element')
        
        // Wait for video to load metadata
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded, activating camera')
          videoRef.current.play()
          setCameraActive(true)
        }
        
        // Fallback timeout
        setTimeout(() => {
          console.log('⏱️  Timeout reached, activating camera anyway')
          setCameraActive(true)
        }, 1000)
      }
    } catch (err) {
      console.error('❌ Camera error:', err)
      setStreamStarted(false)
      setError('Could not access camera. Please check permissions.')
      setCameraActive(false)
    }
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas not ready')
      setError('Camera not ready. Please try again.')
      return
    }
    
    const context = canvasRef.current.getContext('2d')
    const video = videoRef.current
    
    console.log('📸 Video dimensions:', video.videoWidth, 'x', video.videoHeight)
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera still loading. Please wait a moment and try again.')
      return
    }
    
    try {
      canvasRef.current.width = video.videoWidth
      canvasRef.current.height = video.videoHeight
      
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8)
      
      console.log('✅ Image captured:', imageData.length, 'bytes')
      await handleVerify(imageData)
    } catch (err) {
      console.error('❌ Capture error:', err)
      setError('Failed to capture image. Please try again.')
    }
  }

  const handleVerify = async (afterImg) => {
    setLoading(true)
    try {
      const response = await cleaningApi.verifyCleaning({
        reportId,
        beforeImageBase64: beforeImage,
        afterImageBase64: afterImg,
        userId: user?.id,
        userName: user?.name || 'Anonymous',
        userType
      })

      if (!response.data.is_cleaned) {
        setError(response.data.message || 'Area does not appear to be cleaned. Please try again.')
        setCameraActive(false)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      } else {
        // Mark as cleaned
        await cleaningApi.markCleaned({
          reportId,
          beforeImageBase64: beforeImage,
          afterImageBase64: afterImg,
          userId: user?.id,
          userName: user?.name || 'Anonymous',
          userType
        })
        setStage('verify')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      setCameraActive(false)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">🧹 Cleanup</h1>
          <button
            onClick={() => navigate('/cleaner')}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin mb-4">
              <div className="text-4xl">⏳</div>
            </div>
            <p className="text-gray-600 text-center">Loading cleanup task...</p>
          </div>
        )}

        {stage === 'location_error' && (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📍</p>
            <p className="text-gray-600 mb-6">We need your location to verify cleanup</p>
            <button
              onClick={getLocation}
              disabled={locationLoading}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg disabled:bg-gray-400"
            >
              {locationLoading ? 'Getting location...' : 'Enable Location'}
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">❌</p>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/cleaner')}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg"
            >
              Back to Cleanup Areas
            </button>
          </div>
        )}

        {stage === 'after' && beforeImage && (
          <div>
            {/* Before Image Card */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📸</span>
                <h2 className="font-bold text-gray-800">Before Photo</h2>
              </div>
              <img
                src={beforeImage}
                alt="Before"
                className="w-full rounded-lg object-cover border-2 border-blue-200"
                style={{ maxHeight: '280px' }}
              />
              <p className="text-sm text-gray-500 mt-3 text-center">Original report image</p>
            </div>

            {/* Instructions */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧹</span>
                <div>
                  <p className="font-semibold text-gray-800">Clean this area</p>
                  <p className="text-sm text-gray-600 mt-1">Once cleaned, take a photo to prove it</p>
                </div>
              </div>
            </div>

            {/* Camera Section */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              {!streamStarted && (
                <button
                  onClick={startCamera}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-lg"
                >
                  <span>📷</span> Open Camera
                </button>
              )}

              {streamStarted && (
                <div>
                  <p className="text-sm text-gray-600 text-center mb-3">Position the cleaned area in view</p>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full bg-black rounded-lg mb-4 border-2 border-gray-300"
                    style={{ maxHeight: '400px', objectFit: 'cover' }}
                  />
                  {cameraActive && (
                    <button
                      onClick={captureImage}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-lg text-lg flex items-center justify-center gap-2"
                    >
                      <span>📸</span> {loading ? 'Verifying...' : 'Take After Photo'}
                    </button>
                  )}
                  {!cameraActive && (
                    <p className="text-center text-gray-500 py-2">Initializing camera...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {stage === 'verify' && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4 animate-bounce">✅</div>
            <h2 className="text-3xl font-bold text-green-600 mb-2">Cleanup Verified!</h2>
            <p className="text-gray-600 mb-8">Thank you for helping clean up the Brahmaputra River</p>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-600 mb-2">Points Earned</p>
              <p className="text-4xl font-bold text-green-600">+10 pts</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg text-lg"
            >
              View Dashboard
            </button>
            <button
              onClick={() => navigate('/cleaner')}
              className="w-full py-3 text-blue-600 font-semibold mt-3 rounded-lg hover:bg-gray-100"
            >
              More Cleanup Areas
            </button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </main>
    </div>
  )
}
