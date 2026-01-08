from fastapi import APIRouter
from services.firebase_service import get_firestore_client
from google.cloud.firestore import FieldFilter
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/user/{userId}")
async def get_user_analytics(userId: str):
    """Get user analytics - reports and cleanings count"""
    try:
        db = get_firestore_client()
        
        # Count reports by user
        reports = db.collection("reports").where(filter=FieldFilter("userId", "==", userId)).stream()
        reports_count = sum(1 for _ in reports)
        
        # Count cleanings by user
        cleanings = db.collection("cleanings").where(filter=FieldFilter("userId", "==", userId)).stream()
        cleanings_count = sum(1 for _ in cleanings)
        
        # Calculate total points
        cleanings_list = db.collection("cleanings").where(filter=FieldFilter("userId", "==", userId)).stream()
        total_points = sum(c.to_dict().get("pointsAwarded", 0) for c in cleanings_list)
        total_points += reports_count * 10  # 10 points per report
        
        return {
            "userId": userId,
            "reportsCount": reports_count,
            "cleaningsCount": cleanings_count,
            "totalPoints": total_points,
            "userRank": 0
        }
    except Exception as e:
        return {
            "userId": userId,
            "reportsCount": 0,
            "cleaningsCount": 0,
            "totalPoints": 0,
            "userRank": 0
        }

@router.get("/ngo/{ngoId}")
async def get_ngo_analytics(ngoId: str):
    """Get NGO analytics"""
    try:
        db = get_firestore_client()
        
        reports = db.collection("reports").where(filter=FieldFilter("userId", "==", ngoId)).stream()
        reports_count = sum(1 for _ in reports)
        
        cleanings = db.collection("cleanings").where(filter=FieldFilter("userId", "==", ngoId)).stream()
        cleanings_count = sum(1 for _ in cleanings)
        
        cleanings_list = db.collection("cleanings").where(filter=FieldFilter("userId", "==", ngoId)).stream()
        total_points = sum(c.to_dict().get("pointsAwarded", 0) for c in cleanings_list)
        total_points += reports_count * 10
        
        return {
            "ngoId": ngoId,
            "reportsCount": reports_count,
            "cleaningsCount": cleanings_count,
            "totalPoints": total_points,
            "ngoRank": 0
        }
    except Exception as e:
        return {
            "ngoId": ngoId,
            "reportsCount": 0,
            "cleaningsCount": 0,
            "totalPoints": 0,
            "ngoRank": 0
        }

@router.get("/global")
async def get_global_analytics():
    """Get global platform analytics"""
    try:
        db = get_firestore_client()
        
        # Count all reports
        all_reports = db.collection("reports").stream()
        reports_list = [r.to_dict() for r in all_reports]
        total_reports = len(reports_list)
        
        # Count cleaned reports
        cleaned_reports = [r for r in reports_list if r.get("status") == "cleaned"]
        total_cleanings = len(cleaned_reports)
        
        # Count active (not cleaned) reports
        active_reports = total_reports - total_cleanings
        
        # Waste breakdown
        waste_breakdown = {
            "plastic": 0,
            "organic": 0,
            "mixed": 0,
            "toxic": 0,
            "sewage": 0
        }
        
        for report in reports_list:
            waste_type = report.get("wasteType", "")
            if waste_type in waste_breakdown:
                waste_breakdown[waste_type] += 1
        
        return {
            "totalReports": total_reports,
            "totalCleanings": total_cleanings,
            "activeReports": active_reports,
            "usersCount": 0,
            "ngosCount": 0,
            "wasteBreakdown": waste_breakdown
        }
    except Exception as e:
        return {
            "totalReports": 0,
            "totalCleanings": 0,
            "activeReports": 0,
            "usersCount": 0,
            "ngosCount": 0,
            "wasteBreakdown": {
                "plastic": 0,
                "organic": 0,
                "mixed": 0,
                "toxic": 0,
                "sewage": 0
            }
        }

@router.get("/leaderboard/users")
async def get_users_leaderboard(category: str = "reporting", limit: int = 20):
    """Get user leaderboard - reporting or cleaning"""
    try:
        db = get_firestore_client()
        
        if category == "reporting":
            # Get all users with their reports count
            reports = db.collection("reports").where(filter=FieldFilter("userType", "==", "individual")).stream()
            user_stats = {}
            
            for report in reports:
                data = report.to_dict()
                user_id = data.get("userId")
                user_name = data.get("userName", "Anonymous")
                
                # Skip if no userId (unlogged-in users)
                if user_id and user_id.strip():
                    if user_id not in user_stats:
                        user_stats[user_id] = {"id": user_id, "name": user_name, "points": 0, "city": ""}
                    user_stats[user_id]["points"] += 10  # 10 points per report
            
            leaderboard = sorted(user_stats.values(), key=lambda x: x["points"], reverse=True)[:limit]
            
        elif category == "cleaning":
            # Get all users with their cleanings points
            cleanings = db.collection("cleanings").where(filter=FieldFilter("userType", "==", "individual")).stream()
            user_stats = {}
            
            for cleaning in cleanings:
                data = cleaning.to_dict()
                user_id = data.get("userId")
                user_name = data.get("userName", "Anonymous")
                points = data.get("pointsAwarded", 0)
                
                # Skip if no userId (unlogged-in users)
                if user_id and user_id.strip():
                    if user_id not in user_stats:
                        user_stats[user_id] = {"id": user_id, "name": user_name, "points": 0, "city": ""}
                    user_stats[user_id]["points"] += points
            
            leaderboard = sorted(user_stats.values(), key=lambda x: x["points"], reverse=True)[:limit]
        
        elif category == "overall":
            # Combine reporting and cleaning points
            user_stats = {}
            
            # Add reporting points
            reports = db.collection("reports").where(filter=FieldFilter("userType", "==", "individual")).stream()
            for report in reports:
                data = report.to_dict()
                user_id = data.get("userId")
                user_name = data.get("userName", "Anonymous")
                
                if user_id and user_id.strip():
                    if user_id not in user_stats:
                        user_stats[user_id] = {"id": user_id, "name": user_name, "points": 0, "city": ""}
                    user_stats[user_id]["points"] += 10
            
            # Add cleaning points
            cleanings = db.collection("cleanings").where(filter=FieldFilter("userType", "==", "individual")).stream()
            for cleaning in cleanings:
                data = cleaning.to_dict()
                user_id = data.get("userId")
                user_name = data.get("userName", "Anonymous")
                points = data.get("pointsAwarded", 0)
                
                if user_id and user_id.strip():
                    if user_id not in user_stats:
                        user_stats[user_id] = {"id": user_id, "name": user_name, "points": 0, "city": ""}
                    user_stats[user_id]["points"] += points
            
            leaderboard = sorted(user_stats.values(), key=lambda x: x["points"], reverse=True)[:limit]
        else:
            leaderboard = []
        
        return {"leaderboard": leaderboard}
    except Exception as e:
        print(f"Error getting leaderboard: {str(e)}")
        return {"leaderboard": []}

@router.get("/leaderboard/ngos")
async def get_ngos_leaderboard(category: str = "reporting", limit: int = 20):
    """Get NGO leaderboard - reporting or cleaning"""
    try:
        db = get_firestore_client()
        
        if category == "reporting":
            reports = db.collection("reports").where(filter=FieldFilter("userType", "==", "ngo")).stream()
            ngo_stats = {}
            
            for report in reports:
                data = report.to_dict()
                ngo_id = data.get("userId")
                ngo_name = data.get("userName", "Anonymous NGO")
                
                # Skip if no userId
                if ngo_id and ngo_id.strip():
                    if ngo_id not in ngo_stats:
                        ngo_stats[ngo_id] = {"id": ngo_id, "name": ngo_name, "points": 0, "city": ""}
                    ngo_stats[ngo_id]["points"] += 10
            
            leaderboard = sorted(ngo_stats.values(), key=lambda x: x["points"], reverse=True)[:limit]
            
        elif category == "cleaning":
            cleanings = db.collection("cleanings").where(filter=FieldFilter("userType", "==", "ngo")).stream()
            ngo_stats = {}
            
            for cleaning in cleanings:
                data = cleaning.to_dict()
                ngo_id = data.get("userId")
                ngo_name = data.get("userName", "Anonymous NGO")
                points = data.get("pointsAwarded", 0)
                
                # Skip if no userId
                if ngo_id and ngo_id.strip():
                    if ngo_id not in ngo_stats:
                        ngo_stats[ngo_id] = {"id": ngo_id, "name": ngo_name, "points": 0, "city": ""}
                    ngo_stats[ngo_id]["points"] += points
            
            leaderboard = sorted(ngo_stats.values(), key=lambda x: x["points"], reverse=True)[:limit]
        
        elif category == "overall":
            # Combine reporting and cleaning points for NGOs
            ngo_stats = {}
            
            # Add reporting points
            reports = db.collection("reports").where(filter=FieldFilter("userType", "==", "ngo")).stream()
            for report in reports:
                data = report.to_dict()
                ngo_id = data.get("userId")
                ngo_name = data.get("userName", "Anonymous NGO")
                
                if ngo_id and ngo_id.strip():
                    if ngo_id not in ngo_stats:
                        ngo_stats[ngo_id] = {"id": ngo_id, "name": ngo_name, "points": 0, "city": ""}
                    ngo_stats[ngo_id]["points"] += 10
            
            # Add cleaning points
            cleanings = db.collection("cleanings").where(filter=FieldFilter("userType", "==", "ngo")).stream()
            for cleaning in cleanings:
                data = cleaning.to_dict()
                ngo_id = data.get("userId")
                ngo_name = data.get("userName", "Anonymous NGO")
                points = data.get("pointsAwarded", 0)
                
                if ngo_id and ngo_id.strip():
                    if ngo_id not in ngo_stats:
                        ngo_stats[ngo_id] = {"id": ngo_id, "name": ngo_name, "points": 0, "city": ""}
                    ngo_stats[ngo_id]["points"] += points
            
            leaderboard = sorted(ngo_stats.values(), key=lambda x: x["points"], reverse=True)[:limit]
        else:
            leaderboard = []
        
        return {"leaderboard": leaderboard}
    except Exception as e:
        print(f"Error getting NGO leaderboard: {str(e)}")
        return {"leaderboard": []}

@router.get("/time-buckets")
async def get_time_buckets():
    """Counts of reports and cleanings for current week, month, and year.
    Uses createdAt/cleanedAt when present, otherwise falls back to document create_time.
    """
    try:
        db = get_firestore_client()

        now = datetime.now(timezone.utc)
        week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        def as_dt(val, fallback: datetime):
            try:
                if val is None:
                    return fallback
                if isinstance(val, datetime):
                    return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
                if isinstance(val, (int, float)):
                    # Support epoch millis
                    return datetime.fromtimestamp(val / 1000.0, tz=timezone.utc)
                if isinstance(val, str):
                    try:
                        dt = datetime.fromisoformat(val)
                        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
                    except Exception:
                        return fallback
                return fallback
            except Exception:
                return fallback

        def count_buckets(docs, get_time_field, fallback_time):
            w = m = y = 0
            for d in docs:
                data = d.to_dict() or {}
                t = get_time_field(data)
                dt = as_dt(t, fallback_time(d))
                if dt >= week_start:
                    w += 1
                if dt >= month_start:
                    m += 1
                if dt >= year_start:
                    y += 1
            return w, m, y

        reports_docs = list(db.collection('reports').stream())
        cleanings_docs = list(db.collection('cleanings').stream())

        r_w, r_m, r_y = count_buckets(
            reports_docs,
            lambda x: x.get('createdAt'),
            lambda d: (getattr(d, 'create_time', now))
        )

        c_w, c_m, c_y = count_buckets(
            cleanings_docs,
            lambda x: x.get('cleanedAt') or x.get('createdAt'),
            lambda d: (getattr(d, 'create_time', now))
        )

        return {
            'reports': { 'week': r_w, 'month': r_m, 'year': r_y },
            'cleanings': { 'week': c_w, 'month': c_m, 'year': c_y }
        }
    except Exception as e:
        print(f"Error computing time buckets: {str(e)}")
        return {
            'reports': { 'week': 0, 'month': 0, 'year': 0 },
            'cleanings': { 'week': 0, 'month': 0, 'year': 0 }
        }
