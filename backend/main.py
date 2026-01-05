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

# CORS Configuration
origins = [
    # Local development
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    # Local mobile/network
    "http://192.168.29.84:3000",
    "http://192.168.29.84:5173",
    "http://192.168.29.84:5174",
    # Production
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"(http://localhost.*|https://.*\.vercel\.app)",
)

logger.info(f"✅ CORS enabled for: {origins}")

@app.get("/health")
def health_check():
    """Health check endpoint for uptime monitoring and keep-alive"""
    logger.info("🏥 Health check called")
    return {"status": "healthy", "message": "LUIT Backend is running", "timestamp": str(__import__('datetime').datetime.utcnow())}

@app.get("/")
def root():
    return {"message": "Welcome to LUIT API"}

# Import routes
from routes import auth, reporting, cleaning, analytics, location

app.include_router(auth.router)
app.include_router(reporting.router)
app.include_router(cleaning.router)
app.include_router(analytics.router)
app.include_router(location.router)

logger.info("✅ All routes registered")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 5000))
    logger.info(f"🚀 Starting LUIT Backend on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
