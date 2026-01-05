import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocationStore, useAuthStore } from '../store'
import { cleaningApi, reportingApi } from '../api'

export default function CleaningPage() {
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useAuthStore((state) => state.user)
  const userType = useAuthStore((state) => state.userType)
  const setLocation = useLocationStore((state) => state.setLocation)
  const { latitude, longitude } = useLocationStore()
  
  const [beforeImage, setBeforeImage] = useState(null)
  const [beforeImageBase64, setBeforeImageBase64] = useState(null)
  const [afterImage, setAfterImage] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
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
      setSuccess('✅ Cleanup verified and recorded!')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      console.error('❌ Submit error:', err)
      setError('Error submitting cleanup: ' + (err.response?.data?.detail || err.message))
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

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
            {success}
          </div>
        )}

        {!beforeImage ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading cleanup task...</p>
          </div>
        ) : (
          <>
            {/* Before Image */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📸</span>
                <h2 className="font-bold text-gray-800">Before Photo</h2>
              </div>
              <img
                src={beforeImage}
                alt="Before"
                className="w-full rounded-lg object-cover border-2 border-blue-200"
                style={{ maxHeight: '300px' }}
              />
              <p className="text-sm text-gray-500 mt-3 text-center">Original report</p>
            </div>

            {/* Instructions */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧹</span>
                <div>
                  <p className="font-semibold text-gray-800">Clean this area</p>
                  <p className="text-sm text-gray-600 mt-1">Take a photo after cleaning to verify</p>
                </div>
              </div>
            </div>

            {/* Camera Section */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              {!cameraStarted && (
                <button
                  onClick={startCamera}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-lg"
                >
                  <span>📷</span> Open Camera
                </button>
              )}

              {cameraStarted && (
                <div>
                  <p className="text-sm text-gray-600 text-center mb-3">Position the cleaned area</p>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full bg-black rounded-lg mb-4 border-2 border-gray-300"
                    style={{ maxHeight: '400px', objectFit: 'cover' }}
                  />
                  {!cameraActive && (
                    <p className="text-center text-gray-500 py-2">Initializing camera...</p>
                  )}
                  {cameraActive && !afterImage && (
                    <button
                      onClick={captureImage}
                      disabled={verifying}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-lg text-lg flex items-center justify-center gap-2"
                    >
                      <span>📸</span> {verifying ? 'Verifying...' : 'Take After Photo'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Verification Result */}
            {verification && (
              <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{verification.is_cleaned ? '✅' : '❌'}</span>
                  <div>
                    <p className="font-bold text-gray-800">{verification.is_cleaned ? 'Cleanup Verified!' : 'Not Cleaned'}</p>
                    <p className="text-sm text-gray-600">{verification.message}</p>
                  </div>
                </div>

                {verification.is_cleaned && afterImage && (
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-800 mb-2">After Photo</h3>
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
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-lg text-lg"
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
                    className="w-full py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg text-lg"
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
    </div>
  )
}
