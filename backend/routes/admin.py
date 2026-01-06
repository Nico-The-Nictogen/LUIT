from fastapi import APIRouter, HTTPException
from firebase_admin import firestore

router = APIRouter(prefix="/admin", tags=["admin"])
db = firestore.client()

@router.get("/reports")
async def get_all_reports():
    """Get all reports for admin view"""
    try:
        reports_ref = db.collection('reports')
        reports = []
        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            report_data['id'] = doc.id
            reports.append(report_data)
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cleanings")
async def get_all_cleanings():
    """Get all cleanings for admin view"""
    try:
        cleanings_ref = db.collection('cleanings')
        cleanings = []
        for doc in cleanings_ref.stream():
            cleaning_data = doc.to_dict()
            cleaning_data['id'] = doc.id
            cleanings.append(cleaning_data)
        return cleanings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
async def get_all_users():
    """Get all users for admin view"""
    try:
        users_ref = db.collection('users')
        users = []
        for doc in users_ref.stream():
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            # Don't send password
            user_data.pop('password', None)
            users.append(user_data)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ngos")
async def get_all_ngos():
    """Get all NGOs for admin view"""
    try:
        ngos_ref = db.collection('ngos')
        ngos = []
        for doc in ngos_ref.stream():
            ngo_data = doc.to_dict()
            ngo_data['id'] = doc.id
            # Don't send password
            ngo_data.pop('password', None)
            ngos.append(ngo_data)
        return ngos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear/reports")
async def clear_all_reports():
    """Delete all reports from database"""
    try:
        reports_ref = db.collection('reports')
        batch = db.batch()
        count = 0
        
        for doc in reports_ref.stream():
            batch.delete(doc.reference)
            count += 1
            
            # Firestore batch limit is 500
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        batch.commit()
        return {"message": f"Cleared {count} reports"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear/cleanings")
async def clear_all_cleanings():
    """Delete all cleanings and reset user points"""
    try:
        # Clear cleanings
        cleanings_ref = db.collection('cleanings')
        batch = db.batch()
        count = 0
        
        for doc in cleanings_ref.stream():
            batch.delete(doc.reference)
            count += 1
            
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        batch.commit()
        
        # Reset user points
        users_ref = db.collection('users')
        user_batch = db.batch()
        user_count = 0
        
        for doc in users_ref.stream():
            user_batch.update(doc.reference, {
                'points': 0,
                'cleaningsCount': 0
            })
            user_count += 1
            
            if user_count % 500 == 0:
                user_batch.commit()
                user_batch = db.batch()
        
        user_batch.commit()
        
        # Reset NGO points
        ngos_ref = db.collection('ngos')
        ngo_batch = db.batch()
        ngo_count = 0
        
        for doc in ngos_ref.stream():
            ngo_batch.update(doc.reference, {
                'points': 0,
                'cleaningsCount': 0
            })
            ngo_count += 1
            
            if ngo_count % 500 == 0:
                ngo_batch.commit()
                ngo_batch = db.batch()
        
        ngo_batch.commit()
        
        return {"message": f"Cleared {count} cleanings and reset all points"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear/users")
async def clear_all_users():
    """Delete all users from database"""
    try:
        users_ref = db.collection('users')
        batch = db.batch()
        count = 0
        
        for doc in users_ref.stream():
            batch.delete(doc.reference)
            count += 1
            
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        batch.commit()
        return {"message": f"Cleared {count} users"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear/ngos")
async def clear_all_ngos():
    """Delete all NGOs from database"""
    try:
        ngos_ref = db.collection('ngos')
        batch = db.batch()
        count = 0
        
        for doc in ngos_ref.stream():
            batch.delete(doc.reference)
            count += 1
            
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        batch.commit()
        return {"message": f"Cleared {count} NGOs"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
