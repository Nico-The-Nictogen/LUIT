from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="LUIT Backend", version="1.0.0")
 
# Initialize Firebase Admin SDK before importing any routes that use Firestore/Auth
try:
    from services.firebase_service import init_firebase
    init_firebase()
    logger.info("✅ Firebase Admin SDK initialized")
except Exception as e:
    logger.error(f"❌ Firebase initialization failed: {e}")
    # Proceeding allows health endpoint to work; Firestore routes will raise until fixed

# CORS Configuration - Allow specific origins
allowed_origins = [
    "https://luit.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

logger.info("✅ CORS enabled for origins: " + ", ".join(allowed_origins))

@app.get("/health")
def health_check():
    """Health check endpoint for uptime monitoring and keep-alive"""
    logger.info("🏥 Health check called")
    return {
        "status": "healthy", 
        "message": "LUIT Backend is running", 
        "timestamp": str(__import__('datetime').datetime.utcnow()),
        "admin_enabled": True
    }

@app.get("/")
def root():
    return {"message": "Welcome to LUIT API"}

# Import routes
from routes import auth, reporting, cleaning, analytics, location, admin

app.include_router(auth.router)
app.include_router(reporting.router)
app.include_router(cleaning.router)
app.include_router(analytics.router)
app.include_router(location.router)
app.include_router(admin.router)

logger.info("✅ All routes registered")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 5000))
    logger.info(f"🚀 Starting LUIT Backend on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
