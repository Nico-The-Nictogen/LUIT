import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocationStore, useAuthStore } from '../store'
import { cleaningApi, locationApi } from '../api'

export default function CleaningPage() {
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  const setLocation = useLocationStore((state) => state.setLocation)
  const { latitude, longitude } = useLocationStore()
  
  const [stage, setStage] = useState('location') // location -> before -> cleaning -> after -> verify
  const [beforeImage, setBeforeImage] = useState(null)
  const [afterImage, setAfterImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    getLocation()
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
          setStage('before')
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('Cannot access camera')
    }
  }

  const captureImage = (type) => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
      const imageData = canvasRef.current.toDataURL('image/jpeg')
      
      if (type === 'before') {
        setBeforeImage(imageData)
        setStage('cleaning')
      } else if (type === 'after') {
        setAfterImage(imageData)
        handleVerify(imageData)
      }
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
        setStage('cleaning')
      } else {
        // Mark as cleaned
        await cleaningApi.markCleaned({
          reportId,
          beforeImageBase64: beforeImage,
          afterImageBase64: afterImg,
          userId: user?.id,
          userType
        })
        setStage('verify')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed')
      setAfterImage(null)
      setStage('cleaning')
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

        {stage === 'location' && (
          <div className="text-center py-8">
            {locationLoading ? (
              <p className="text-gray-600">Getting your location...</p>
            ) : (
              <button
                onClick={getLocation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
              >
                Enable Location
              </button>
            )}
          </div>
        )}

        {stage === 'before' && (
          <div>
            <p className="text-center text-gray-600 mb-4">📷 Capture the BEFORE image</p>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full bg-black rounded-lg mb-4"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
              onLoadedMetadata={startCamera}
            />
            <button
              onClick={() => captureImage('before')}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg"
            >
              Capture BEFORE
            </button>
          </div>
        )}

        {stage === 'cleaning' && (
          <div>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-center text-gray-700">🧹 Please clean the area now</p>
            </div>
            <img
              src={beforeImage}
              alt="Before"
              className="w-full rounded-lg mb-4 max-h-48 object-contain border-2 border-blue-300"
            />
            <button
              onClick={() => {
                setStage('after')
                startCamera()
              }}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-lg"
            >
              Area Cleaned - Take AFTER Photo
            </button>
          </div>
        )}

        {stage === 'after' && (
          <div>
            <p className="text-center text-gray-600 mb-4">📷 Capture the AFTER image</p>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full bg-black rounded-lg mb-4"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
            />
            <button
              onClick={() => captureImage('after')}
              disabled={loading}
              className="w-full py-3 bg-green-600 disabled:bg-gray-400 text-white font-bold rounded-lg"
            >
              {loading ? 'Verifying...' : 'Capture AFTER'}
            </button>
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
