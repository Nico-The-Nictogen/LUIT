from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.image_verification import verify_cleaning_image
from services.cloudinary_service import upload_image_to_cloudinary, delete_image_from_cloudinary
from services.firebase_service import get_document, update_document, add_document
from datetime import datetime

router = APIRouter(prefix="/cleaning", tags=["cleaning"])

class CleaningRequest(BaseModel):
    reportId: str
    beforeImageBase64: str
    afterImageBase64: str
    userId: str
    userType: str
    userName: str = "Anonymous"

@router.post("/verify")
async def verify_cleaning(request: CleaningRequest):
    """Verify if area is cleaned"""
    try:
        result = await verify_cleaning_image(request.beforeImageBase64, request.afterImageBase64)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/mark-cleaned")
async def mark_cleaned(request: CleaningRequest):
    """Mark report as cleaned"""
    try:
        # Verify cleaning first
        verification = await verify_cleaning_image(request.beforeImageBase64, request.afterImageBase64)
        if not verification['is_cleaned']:
            return {"success": False, "message": verification['message']}
        
        # Get report details
        report = get_document("reports", request.reportId)
        if not report:
            return {"success": False, "message": "Report not found"}
        
        # Upload after image to Cloudinary
        upload_result = await upload_image_to_cloudinary(request.afterImageBase64, folder="luit/cleanings")
        if not upload_result['success']:
            return {"success": False, "message": "Failed to upload after image"}
        
        # Calculate points based on waste type
        points_map = {
            "plastic": 10,
            "organic": 20,
            "mixed": 30,
            "toxic": 50,
            "sewage": 100
        }
        points_awarded = points_map.get(report.get('wasteType'), 10)
        
        # Update report as cleaned
        update_data = {
            "status": "cleaned",
            "cleanedBy": request.userId,
            "cleanedByName": request.userName,
            "cleanedAt": datetime.now().isoformat(),
            "afterImageUrl": upload_result['url'],
            "afterImagePublicId": upload_result['public_id']
        }
        update_document("reports", request.reportId, update_data)
        
        # Record cleaning activity
        cleaning_record = {
            "reportId": request.reportId,
            "userId": request.userId,
            "userType": request.userType,
            "userName": request.userName,
            "wasteType": report.get('wasteType'),
            "pointsAwarded": points_awarded,
            "cleanedAt": datetime.now().isoformat()
        }
        add_document("cleanings", cleaning_record)
        
        return {
            "success": True,
            "message": "Area marked as cleaned!",
            "pointsAwarded": points_awarded
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/available")
async def get_available_cleanings(wasteType: str = None, userType: str = None):
    """Get available cleanings to participate in"""
    try:
        # Query active reports
        # Filter by waste type if specified
        # NGOs see all types including sewage
        # Individuals don't see sewage type
        
        cleanings = []
        # Implementation would query Firestore for active reports
        
        return {"success": True, "cleanings": cleanings}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
