from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from firebase_admin import auth, firestore
import requests
import os

router = APIRouter(prefix="/auth", tags=["authentication"])
db = firestore.client()

# Firebase Web API Key
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "")
FIREBASE_AUTH_ENDPOINT = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_WEB_API_KEY}"
FIREBASE_LOGIN_ENDPOINT = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"

class RegisterRequest(BaseModel):
    userType: Literal["individual", "ngo"]
    name: Optional[str] = None
    email: EmailStr
    password: str
    ngoName: Optional[str] = None

class LoginRequest(BaseModel):
    userType: Literal["individual", "ngo"]
    identifier: str  # name for individual, ngo_name for ngo
    password: str

@router.post("/register")
async def register(request: RegisterRequest):
    """Register new user or NGO with Firebase Auth"""
    try:
        if request.userType == "individual" and not request.name:
            raise HTTPException(status_code=400, detail="Name is required for individual registration")
        if request.userType == "ngo" and not request.ngoName:
            raise HTTPException(status_code=400, detail="NGO name is required for NGO registration")

        # Create user in Firebase Auth via REST API
        payload = {
            "email": request.email,
            "password": request.password,
            "returnSecureToken": True
        }
        
        response = requests.post(FIREBASE_AUTH_ENDPOINT, json=payload)
        auth_data = response.json()
        
        if response.status_code != 200:
            error_msg = auth_data.get('error', {}).get('message', 'Registration failed')
            raise HTTPException(status_code=400, detail=error_msg)
        
        user_id = auth_data.get('localId')
        id_token = auth_data.get('idToken')
        
        # Set custom claims for userType
        auth.set_custom_user_claims(user_id, {'userType': request.userType})

        display_name = request.name if request.userType == 'individual' else request.ngoName
        
        # Store user profile in Firestore
        user_data = {
            'userId': user_id,
            'email': request.email,
            'userType': request.userType,
            'name': display_name,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        db.collection('users').document(user_id).set(user_data)
        
        print(f"✅ User registered: {user_id} ({request.userType})")
        
        return {
            "message": "Registration successful",
            "userType": request.userType,
            "idToken": id_token,
            "userId": user_id,
            "email": request.email
        }
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@router.post("/login")
async def login(request: LoginRequest):
    """Login user or NGO with Firebase Auth"""
    try:
        # For now, we need to get email from identifier
        # In production, you'd query Firestore to find user by name/ngoName
        # For this MVP, we'll accept email as identifier
        
        payload = {
            "email": request.identifier,  # Expect email as identifier
            "password": request.password,
            "returnSecureToken": True
        }
        
        response = requests.post(FIREBASE_LOGIN_ENDPOINT, json=payload)
        auth_data = response.json()
        
        if response.status_code != 200:
            error_msg = auth_data.get('error', {}).get('message', 'Login failed')
            raise HTTPException(status_code=401, detail=error_msg)
        
        user_id = auth_data.get('localId')
        id_token = auth_data.get('idToken')
        
        # Get user profile from Firestore
        user_doc = db.collection('users').document(user_id).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        user_type = user_data.get('userType', 'individual')
        
        print(f"✅ User logged in: {user_id} ({user_type})")
        
        return {
            "message": "Login successful",
            "userType": user_type,
            "idToken": id_token,
            "userId": user_id,
            "email": auth_data.get('email'),
            "name": user_data.get('name', '')
        }
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

@router.post("/logout")
async def logout():
    """Logout user"""
    return {"message": "Logged out successfully"}
