from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Firebase
    firebase_project_id: str
    firebase_private_key_id: str
    firebase_private_key: str
    firebase_client_email: str
    firebase_client_id: str
    
    # Google Cloud
    google_cloud_project_id: str
    
    # Cloudinary
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str
    
    # Backend
    backend_port: int = 5000
    backend_env: str = "development"
    frontend_url: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
