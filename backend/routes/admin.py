from fastapi import APIRouter, HTTPException
from firebase_admin import firestore, auth

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
    """Get all users from Firebase Authentication"""
    try:
        users_list = []
        page = auth.list_users()
        
        while page:
            for user in page.users:
                # Get activity counts from Firestore
                reports_count = 0
                cleanings_count = 0
                
                # Count reports
                reports_ref = db.collection('reports').where('userId', '==', user.uid)
                for _ in reports_ref.stream():
                    reports_count += 1
                
                # Count cleanings
                cleanings_ref = db.collection('cleanings').where('userId', '==', user.uid)
                for _ in cleanings_ref.stream():
                    cleanings_count += 1
                
                users_list.append({
                    'id': user.uid,
                    'name': user.display_name or user.email or 'Unknown',
                    'email': user.email or '',
                    'userType': 'individual',  # TODO: store in Firestore if needed
                    'reportsCount': reports_count,
                    'cleaningsCount': cleanings_count,
                    'createdAt': user.user_metadata.creation_timestamp
                })
            
            # Get next page if exists
            page = page.get_next_page()
        
        return users_list
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return []

@router.get("/ngos")
async def get_all_ngos():
    """Get all unique NGOs from reports and cleanings"""
    try:
        ngos_dict = {}
        
        # Get NGOs from reports (where userType is ngo)
        reports_ref = db.collection('reports')
        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            if report_data.get('userType') == 'ngo':
                user_id = report_data.get('userId')
                user_name = report_data.get('userName', 'Unknown NGO')
                
                if user_id and user_id not in ngos_dict:
                    ngos_dict[user_id] = {
                        'id': user_id,
                        'name': user_name,
                        'userType': 'ngo',
                        'reportsCount': 0,
                        'cleaningsCount': 0,
                        'email': report_data.get('userEmail', '')
                    }
                if user_id:
                    ngos_dict[user_id]['reportsCount'] += 1
        
        # Get NGOs from cleanings
        cleanings_ref = db.collection('cleanings')
        for doc in cleanings_ref.stream():
            cleaning_data = doc.to_dict()
            if cleaning_data.get('userType') == 'ngo':
                user_id = cleaning_data.get('userId')
                user_name = cleaning_data.get('userName', 'Unknown NGO')
                
                if user_id and user_id not in ngos_dict:
                    ngos_dict[user_id] = {
                        'id': user_id,
                        'name': user_name,
                        'userType': 'ngo',
                        'reportsCount': 0,
                        'cleaningsCount': 0,
                        'email': cleaning_data.get('userEmail', '')
                    }
                if user_id:
                    ngos_dict[user_id]['cleaningsCount'] += 1
        
        return list(ngos_dict.values())
    except Exception as e:
        print(f"Error fetching NGOs: {str(e)}")
        return []

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
    """Delete all user data from reports and reset cleanings"""
    try:
        count = 0
        
        # Delete all reports
        reports_ref = db.collection('reports')
        batch = db.batch()
        
        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            if report_data.get('userType') != 'ngo':  # Skip NGO reports
                batch.delete(doc.reference)
                count += 1
                
                if count % 500 == 0:
                    batch.commit()
                    batch = db.batch()
        
        batch.commit()
        
        # Delete user cleanings and reset points
        cleanings_ref = db.collection('cleanings')
        cleaning_batch = db.batch()
        cleaning_count = 0
        
        for doc in cleanings_ref.stream():
            cleaning_data = doc.to_dict()
            if cleaning_data.get('userType') != 'ngo':  # Skip NGO cleanings
                cleaning_batch.delete(doc.reference)
                cleaning_count += 1
                
                if cleaning_count % 500 == 0:
                    cleaning_batch.commit()
                    cleaning_batch = db.batch()
        
        cleaning_batch.commit()
        
        return {"message": f"Cleared {count} user records and {cleaning_count} cleanings"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear/ngos")
async def clear_all_ngos():
    """Delete all NGO data from reports and cleanings"""
    try:
        count = 0
        
        # Delete all NGO reports
        reports_ref = db.collection('reports')
        batch = db.batch()
        
        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            if report_data.get('userType') == 'ngo':
                batch.delete(doc.reference)
                count += 1
                
                if count % 500 == 0:
                    batch.commit()
                    batch = db.batch()
        
        batch.commit()
        
        # Delete NGO cleanings
        cleanings_ref = db.collection('cleanings')
        cleaning_batch = db.batch()
        cleaning_count = 0
        
        for doc in cleanings_ref.stream():
            cleaning_data = doc.to_dict()
            if cleaning_data.get('userType') == 'ngo':
                cleaning_batch.delete(doc.reference)
                cleaning_count += 1
                
                if cleaning_count % 500 == 0:
                    cleaning_batch.commit()
                    cleaning_batch = db.batch()
        
        cleaning_batch.commit()
        
        return {"message": f"Cleared {count} NGO records and {cleaning_count} cleanings"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
