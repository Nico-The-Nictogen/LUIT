from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/location", tags=["location"])

@router.get("/nearby-reports")
async def get_nearby_reports(latitude: float, longitude: float, radius: int = 100):
    """Get all reports within radius (in meters)"""
    try:
        # Query Firebase for nearby reports
        return {"reports": []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/validate-coordinates")
async def validate_coordinates(latitude: float, longitude: float):
    """Validate if coordinates are valid"""
    try:
        if -90 <= latitude <= 90 and -180 <= longitude <= 180:
            return {"valid": True}
        else:
            return {"valid": False, "message": "Invalid coordinates"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
