from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Literal, Optional
from services.image_verification import verify_garbage_image
from services.location_service import check_duplicate_location
from services.cloudinary_service import upload_image_to_cloudinary
from services.firebase_service import add_document, query_documents, get_document
from datetime import datetime

router = APIRouter(prefix="/reporting", tags=["reporting"])

class ReportRequest(BaseModel):
    latitude: float
    longitude: float
    wasteType: Literal["plastic", "organic", "mixed", "toxic", "sewage"]
    imageBase64: Optional[str] = None  # accepts base64 or legacy data URL
    imageUrl: Optional[str] = None     # use when image already uploaded (e.g., Cloudinary URL)
    imagePublicId: Optional[str] = None
    userId: Optional[str] = None
    userName: Optional[str] = None
    userType: Optional[str] = "individual"  # individual, ngo, or anonymous

class VerifyImageRequest(BaseModel):
    image_base64: str

class UploadImageRequest(BaseModel):
    image_base64: str

class DeleteImageRequest(BaseModel):
    public_id: str

@router.post("/upload-image")
async def upload_image(request: UploadImageRequest):
    """Upload image to Cloudinary immediately"""
    try:
        if not request.image_base64:
            raise ValueError("No image data provided")
        
        print(f"📤 Uploading image to Cloudinary... (size: {len(request.image_base64) / 1024:.2f} KB)")
        
        result = await upload_image_to_cloudinary(request.image_base64, folder="luit/reports")
        
        if not result['success']:
            raise ValueError(result['message'])
        
        print(f"✅ Upload complete: {result['url']}")
        
        return {
            "success": True,
            "url": result['url'],
            "public_id": result['public_id'],
            "message": "Image uploaded successfully"
        }
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

@router.post("/delete-image")
async def delete_image(request: DeleteImageRequest):
    """Delete image from Cloudinary if needed"""
    try:
        from services.cloudinary_service import delete_image_from_cloudinary
        
        print(f"🗑️  Deleting image: {request.public_id}")
        
        result = await delete_image_from_cloudinary(request.public_id)
        
        if not result['success']:
            raise ValueError(result['message'])
        
        print(f"✅ Image deleted: {request.public_id}")
        
        return {
            "success": True,
            "message": "Image deleted successfully"
        }
    except Exception as e:
        print(f"⚠️  Delete error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Delete failed: {str(e)}")

@router.post("/verify-image")
async def verify_image(request: VerifyImageRequest):
    """Verify if image contains garbage"""
    try:
        if not request.image_base64:
            raise ValueError("No image data provided")
        
        print(f"📷 Verifying image... (size: {len(request.image_base64) / 1024:.2f} KB)")
        
        result = await verify_garbage_image(request.image_base64)
        
        print(f"✅ Verification complete: is_garbage={result['is_garbage']}")
        
        return result
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Image verification failed: {str(e)}")

@router.post("/check-location")
async def check_location(latitude: float, longitude: float):
    """Check if location is already reported"""
    try:
        result = await check_duplicate_location(latitude, longitude)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/report")
async def create_report(request: ReportRequest):
    """Create new garbage report"""
    try:
        # Resolve image source
        image_url = None
        image_public_id = None

        # Prefer explicit imageUrl from client (already uploaded)
        if request.imageUrl:
            image_url = request.imageUrl
            image_public_id = request.imagePublicId
        elif request.imageBase64:
            # If a URL was sent in the imageBase64 field, accept it without re-uploading
            if request.imageBase64.startswith("http"):
                image_url = request.imageBase64
                image_public_id = request.imagePublicId
            else:
                # Verify garbage only when raw image data is provided
                garbage_check = await verify_garbage_image(request.imageBase64)
                if not garbage_check['is_garbage']:
                    return {"success": False, "message": garbage_check['message']}
                
                upload_result = await upload_image_to_cloudinary(request.imageBase64, folder="luit/reports")
                if not upload_result['success']:
                    return {"success": False, "message": upload_result['message']}
                
                image_url = upload_result['url']
                image_public_id = upload_result['public_id']
        else:
            raise ValueError("No image provided for report")

        # Check for duplicate location
        location_check = await check_duplicate_location(request.latitude, request.longitude)
        if location_check['is_duplicate']:
            return {"success": False, "message": "This location already reported"}
        
        # Save to Firestore
        report_data = {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "wasteType": request.wasteType,
            "imageUrl": image_url,
            "imagePublicId": image_public_id,
            "userId": request.userId,
            "userName": request.userName or "Anonymous",
            "userType": request.userType or "individual",
            "createdAt": datetime.now().isoformat(),
            "status": "active",  # active or cleaned
            "verified": True
        }
        
        # Add to Firestore
        report_id = add_document("reports", report_data)
        
        return {
            "success": True,
            "message": "Report submitted successfully",
            "reportId": report_id,
            "points": 10,
            "imageUrl": image_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports")
async def get_reports(wasteType: str = None, limit: int = 20):
    """Get all reports, optionally filtered by waste type"""
    try:
        if wasteType:
            reports = query_documents("reports", "wasteType", "==", wasteType)
        else:
            # Get all active reports (would need to implement better querying)
            reports = []
        
        return {"success": True, "reports": reports[:limit]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports/{reportId}")
async def get_report(reportId: str):
    """Get specific report details"""
    try:
        report = get_document("reports", reportId)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        # Include the document ID in the response
        report['id'] = reportId
        return {"success": True, "report": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
