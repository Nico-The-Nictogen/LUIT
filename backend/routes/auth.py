from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from firebase_admin import auth, firestore
from firebase_admin.auth import UserNotFoundError
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

        # Prevent duplicate accounts on the same email
        try:
            existing = auth.get_user_by_email(request.email)
            if existing:
                raise HTTPException(status_code=400, detail="An account with this email already exists")
        except UserNotFoundError:
            existing = None

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
            'ngoName': request.ngoName if request.userType == 'ngo' else None,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        db.collection('users').document(user_id).set(user_data)
        
        return {
            "message": "Registration successful",
            "userType": request.userType,
            "idToken": id_token,
            "userId": user_id,
            "email": request.email
        }
    except Exception as e:
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
        if not user_doc.exists:
            raise HTTPException(status_code=401, detail="Account not found")
        user_data = user_doc.to_dict() or {}
        stored_user_type = user_data.get('userType')

        # Enforce account type to prevent cross-login between NGO and individual
        if stored_user_type and stored_user_type != request.userType:
            raise HTTPException(status_code=403, detail="Account type mismatch. Use the correct portal to sign in.")

        # Align custom claims with stored type if needed
        try:
            claims = auth.get_user(user_id).custom_claims or {}
            if stored_user_type and claims.get('userType') != stored_user_type:
                auth.set_custom_user_claims(user_id, {'userType': stored_user_type})
        except Exception:
            pass
        
        return {
            "message": "Login successful",
            "userType": stored_user_type or request.userType,
            "idToken": id_token,
            "userId": user_id,
            "email": auth_data.get('email'),
            "name": user_data.get('name', '')
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

@router.post("/logout")
async def logout():
    """Logout user"""
    return {"message": "Logged out successfully"}
