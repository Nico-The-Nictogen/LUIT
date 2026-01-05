from math import radians, cos, sin, asin, sqrt

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
    Check if a location is already reported within given radius
    Returns: {is_duplicate: bool, nearby_reports: list}
    """
    # This will be implemented with Firebase queries
    # Placeholder for now
    return {
        'is_duplicate': False,
        'nearby_reports': []
    }
