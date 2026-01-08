from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.image_verification import verify_cleaning_image
from services.cloudinary_service import upload_image_to_cloudinary, delete_image_from_cloudinary
from services.firebase_service import get_document, update_document, add_document
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

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
        
        # Delete before image from Cloudinary if it exists
        image_public_id = report.get('imagePublicId')
        
        # If imagePublicId is None but imageUrl exists, extract public_id from URL
        if not image_public_id and report.get('imageUrl'):
            try:
                # Extract public_id from Cloudinary URL
                # Format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{id}.{ext}
                url = report.get('imageUrl')
                if 'cloudinary.com' in url and '/upload/' in url:
                    # Get everything after /upload/v{version}/
                    parts = url.split('/upload/')
                    if len(parts) > 1:
                        # Remove version (v123456/) and get path
                        path_parts = parts[1].split('/', 1)
                        if len(path_parts) > 1:
                            # Get public_id without extension
                            public_id_with_ext = path_parts[1]
                            # Remove file extension
                            image_public_id = public_id_with_ext.rsplit('.', 1)[0]
                            logger.info(f"📝 Extracted public_id from URL: {image_public_id}")
            except Exception as e:
                logger.error(f"❌ Could not extract public_id from URL: {str(e)}")
        
        if image_public_id:
            try:
                logger.info(f"🗑️  Deleting before image from Cloudinary: {image_public_id}")
                await delete_image_from_cloudinary(image_public_id)
                logger.info(f"✅ Before image deleted successfully")
            except Exception as e:
                logger.error(f"❌ Could not delete before image: {str(e)}")
        
        # Calculate points based on waste type
        points_map = {
            "plastic": 10,
            "organic": 20,
            "mixed": 30,
            "toxic": 50,
            "sewage": 100
        }
        points_awarded = points_map.get(report.get('wasteType'), 10)
        
        # Update report as cleaned - remove location and images
        update_data = {
            "status": "cleaned",
            "cleanedBy": request.userId,
            "cleanedByName": request.userName,
            "cleanedAt": datetime.now().isoformat(),
            "latitude": None,
            "longitude": None,
            "imageUrl": None,
            "imagePublicId": None,
            "afterImageUrl": None,
            "afterImagePublicId": None
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
async def get_available_cleanings(wasteType: str = None, userType: str = None, userLat: float | None = None, userLon: float | None = None):
    """Get available cleanings to participate in"""
    try:
        from services.firebase_service import get_firestore_client
        from google.cloud.firestore import FieldFilter
        
        db = get_firestore_client()
        
        # Query active reports (status = "active") using filter keyword argument
        query = db.collection("reports").where(filter=FieldFilter("status", "==", "active"))
        reports = query.stream()
        
        cleanings = []
        for report in reports:
            report_data = report.to_dict()
            
            # Filter by waste type if specified
            if wasteType and report_data.get("wasteType") != wasteType:
                continue
            
            # Individuals shouldn't see sewage
            if userType == "individual" and report_data.get("wasteType") == "sewage":
                continue
            
            # Skip if report is missing essential fields (likely soft-deleted or incomplete)
            if not report_data.get("imageUrl"):
                continue
            if report_data.get("latitude") is None or report_data.get("longitude") is None:
                continue
            
            # Add to cleanings list with calculated distance (uses userLat/userLon if provided)
            def haversine(lat1, lon1, lat2, lon2):
                from math import radians, sin, cos, sqrt, atan2
                R = 6371.0  # Earth radius in km
                dlat = radians(lat2 - lat1)
                dlon = radians(lon2 - lon1)
                a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1 - a))
                return R * c

            report_lat = report_data.get("latitude", 0)
            report_lon = report_data.get("longitude", 0)
            distance_km = 0
            if userLat is not None and userLon is not None:
                try:
                    distance_km = haversine(float(userLat), float(userLon), float(report_lat), float(report_lon))
                except Exception:
                    distance_km = 0
            cleaning = {
                "id": report.id,
                "imageUrl": report_data.get("imageUrl", ""),
                "wasteType": report_data.get("wasteType", "unknown"),
                "latitude": report_lat,
                "longitude": report_lon,
                "distanceKm": round(distance_km, 2),
                "points": get_points_for_waste_type(report_data.get("wasteType", ""))
            }
            cleanings.append(cleaning)
        
        return {"success": True, "cleanings": cleanings}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def get_points_for_waste_type(waste_type: str) -> int:
    """Get points for cleaning a specific waste type"""
    points_map = {
        "plastic": 10,
        "organic": 20,
        "mixed": 30,
        "toxic": 50,
        "sewage": 100
    }
    return points_map.get(waste_type, 10)
