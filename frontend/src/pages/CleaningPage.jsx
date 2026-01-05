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
  
  const [stage, setStage] = useState('loading') // loading -> location -> after -> verify -> error
  const [beforeImage, setBeforeImage] = useState(null)
  const [afterImage, setAfterImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    fetchReport()
    
    // Cleanup: stop camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const fetchReport = async () => {
    try {
      console.log('Fetching report:', reportId)
      const response = await reportingApi.getReport(reportId)
      console.log('Report fetched:', response.data)
      setBeforeImage(response.data.imageUrl)
      getLocation()
    } catch (err) {
      console.error('Failed to load report:', err.response?.data || err.message)
      setError('Failed to load report: ' + (err.response?.data?.detail || err.message))
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
          // Don't auto-start camera, wait for user to click capture
        },
        (err) => {
          setError('Failed to get location. Please enable GPS.')
          setLocationLoading(false)
        }
      )
    }
  }

  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
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
      setError('Cannot access camera: ' + err.message)
      setCameraActive(false)
    }
  }

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
      const imageData = canvasRef.current.toDataURL('image/jpeg')
      setAfterImage(imageData)
      await handleVerify(imageData)
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
        userType
      })

      if (!response.data.is_cleaned) {
        setError(response.data.message)
        setAfterImage(null)
        setStage('after')
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
      setError(err.response?.data?.detail || 'Verification failed')
      setAfterImage(null)
      setStage('after')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Cleanup</h1>
          <button
            onClick={() => navigate('/cleaner')}
            className="text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

        {stage === 'loading' && (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading report...</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/cleaner')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Back to Cleaner
            </button>
          </div>
        )}

        {stage === 'after' && beforeImage && (
          <div>
            <div className="mb-6">
              <h2 className="text-center font-semibold text-gray-800 mb-2">📍 BEFORE (Original Report)</h2>
              <img
                src={beforeImage}
                alt="Before"
                className="w-full rounded-lg object-cover border-2 border-blue-300"
                style={{ maxHeight: '300px' }}
              />
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <p className="text-center text-gray-700">🧹 Clean the area and take an AFTER photo to verify</p>
            </div>

            {!cameraActive && (
              <button
                onClick={startCamera}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg mb-4"
              >
                📷 Open Camera
              </button>
            )}

            {cameraActive && (
              <div>
                <p className="text-center text-gray-600 mb-4">Capture the AFTER image</p>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full bg-black rounded-lg mb-4"
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                />
                <button
                  onClick={captureImage}
                  disabled={loading}
                  className="w-full py-3 bg-green-600 disabled:bg-gray-400 text-white font-bold rounded-lg"
                >
                  {loading ? 'Verifying...' : 'Capture AFTER Image'}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'verify' && (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-2xl font-bold text-green-600 mb-2">Area Cleaned!</p>
            <p className="text-gray-600 mb-6">You earned points for this cleanup</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
      </main>
    </div>
  )
}
