from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Literal

router = APIRouter(prefix="/auth", tags=["authentication"])

class RegisterRequest(BaseModel):
    userType: Literal["individual", "ngo"]
    name: str
    email: EmailStr
    password: str
    ngoName: str = None

class LoginRequest(BaseModel):
    userType: Literal["individual", "ngo"]
    identifier: str  # name for individual, ngo_name for ngo
    password: str

@router.post("/register")
async def register(request: RegisterRequest):
    """Register new user or NGO"""
    try:
        # Firebase authentication will be implemented
        return {
            "message": "Registration successful",
            "userType": request.userType
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(request: LoginRequest):
    """Login user or NGO"""
    try:
        # Firebase authentication will be implemented
        return {
            "message": "Login successful",
            "userType": request.userType,
            "token": "token_placeholder"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/logout")
async def logout():
    """Logout user"""
    return {"message": "Logged out successfully"}
