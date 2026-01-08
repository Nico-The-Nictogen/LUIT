from math import radians, cos, sin, asin, sqrt
import logging

logger = logging.getLogger(__name__)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters
    """
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r

async def check_duplicate_location(latitude: float, longitude: float, radius_meters: float = 100) -> dict:
    """
    Check if a location has active (not cleaned) reports within given radius
    Returns: {is_duplicate: bool, nearby_reports: list, distance_to_closest: float}
    """
    try:
        from services.firebase_service import get_firestore_client
        from google.cloud.firestore import FieldFilter
        
        db = get_firestore_client()
        
        # Get all ACTIVE reports (not cleaned)
        active_reports = db.collection("reports").where(
            filter=FieldFilter("status", "==", "active")
        ).stream()
        
        nearby_reports = []
        min_distance = float('inf')
        
        for report in active_reports:
            data = report.to_dict()
            report_lat = data.get("latitude")
            report_lon = data.get("longitude")
            image_url = data.get("imageUrl")
            
            # Skip any invalid or incomplete reports (missing coordinates or image)
            if report_lat and report_lon and image_url:
                distance = haversine_distance(latitude, longitude, report_lat, report_lon)
                
                logger.info(f"📍 Checking distance to report {report.id}: {distance:.1f}m")
                
                if distance <= radius_meters:
                    nearby_reports.append({
                        "id": report.id,
                        "distance": round(distance, 2),
                        "wasteType": data.get("wasteType"),
                        "latitude": report_lat,
                        "longitude": report_lon
                    })
                    min_distance = min(min_distance, distance)
        
        is_duplicate = len(nearby_reports) > 0
        
        if is_duplicate:
            logger.warning(f"⚠️  Duplicate location detected! {len(nearby_reports)} active report(s) within {radius_meters}m")
            logger.warning(f"📏 Closest report: {min_distance:.1f}m away")
        else:
            logger.info(f"✅ No active reports within {radius_meters}m")
        
        return {
            'is_duplicate': is_duplicate,
            'nearby_reports': nearby_reports,
            'distance_to_closest': round(min_distance, 2) if min_distance != float('inf') else None,
            'radius_checked': radius_meters
        }
    except Exception as e:
        logger.error(f"❌ Error checking duplicate location: {str(e)}")
        return {
            'is_duplicate': False,
            'nearby_reports': [],
            'distance_to_closest': None,
            'radius_checked': radius_meters
        }
