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
    """Get all individual users from Firestore with activity counts.
    Admin UI relies on Firestore as the source of truth so delete operations
    reflect immediately and login remains consistent.
    """
    try:
        users_list = []

        # Read canonical profiles from Firestore
        users_ref = db.collection('users').where('userType', '==', 'individual')
        for doc in users_ref.stream():
            user = doc.to_dict() or {}
            uid = doc.id
            # Count activity
            reports_count = sum(1 for _ in db.collection('reports').where('userId', '==', uid).stream())
            cleanings_count = sum(1 for _ in db.collection('cleanings').where('userId', '==', uid).stream())
            users_list.append({
                'id': uid,
                'name': user.get('name') or user.get('email', 'Unknown'),
                'email': user.get('email', ''),
                'userType': 'individual',
                'reportsCount': reports_count,
                'cleaningsCount': cleanings_count,
                'createdAt': str(user.get('createdAt'))
            })

        return users_list
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return []

@router.get("/ngos")
async def get_all_ngos():
    """Get all NGOs from Firestore with activity counts."""
    try:
        ngos_list = []

        ngos_ref = db.collection('users').where('userType', '==', 'ngo')
        for doc in ngos_ref.stream():
            ngo = doc.to_dict() or {}
            uid = doc.id
            reports_count = sum(1 for _ in db.collection('reports').where('userId', '==', uid).stream())
            cleanings_count = sum(1 for _ in db.collection('cleanings').where('userId', '==', uid).stream())
            ngos_list.append({
                'id': uid,
                'name': ngo.get('ngoName') or ngo.get('name') or 'Unknown NGO',
                'email': ngo.get('email', ''),
                'userType': 'ngo',
                'reportsCount': reports_count,
                'cleaningsCount': cleanings_count,
                'createdAt': str(ngo.get('createdAt'))
            })

        return ngos_list
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
    """Delete all user documents from Firestore and related user data"""
    try:
        # 1) Delete all documents in 'users' collection
        users_ref = db.collection('users')
        users_batch = db.batch()
        users_count = 0

        for doc in users_ref.stream():
            users_batch.delete(doc.reference)
            users_count += 1
            if users_count % 500 == 0:
                users_batch.commit()
                users_batch = db.batch()

        users_batch.commit()

        # 2) Delete all non-NGO reports
        reports_ref = db.collection('reports')
        reports_batch = db.batch()
        reports_count = 0

        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            if report_data.get('userType') != 'ngo':
                reports_batch.delete(doc.reference)
                reports_count += 1
                if reports_count % 500 == 0:
                    reports_batch.commit()
                    reports_batch = db.batch()

        reports_batch.commit()

        # 3) Delete all non-NGO cleanings
        cleanings_ref = db.collection('cleanings')
        cleanings_batch = db.batch()
        cleanings_count = 0

        for doc in cleanings_ref.stream():
            cleaning_data = doc.to_dict()
            if cleaning_data.get('userType') != 'ngo':
                cleanings_batch.delete(doc.reference)
                cleanings_count += 1
                if cleanings_count % 500 == 0:
                    cleanings_batch.commit()
                    cleanings_batch = db.batch()

        cleanings_batch.commit()

        return {
            "message": (
                f"Cleared {users_count} user profiles, "
                f"{reports_count} reports, {cleanings_count} cleanings"
            )
        }
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
# Individual deletion endpoints
@router.delete("/delete/report/{report_id}")
async def delete_report(report_id: str):
    """Delete a single report by ID"""
    try:
        db.collection('reports').document(report_id).delete()
        return {"message": f"Deleted report {report_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/cleaning/{cleaning_id}")
async def delete_cleaning(cleaning_id: str):
    """Delete a single cleaning by ID"""
    try:
        db.collection('cleanings').document(cleaning_id).delete()
        return {"message": f"Deleted cleaning {cleaning_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/user/{user_id}")
async def delete_user(user_id: str):
    """Delete all data for a single user (reports and cleanings)"""
    try:
        count = 0
        
        # Delete user's reports
        reports = db.collection('reports').where('userId', '==', user_id).stream()
        batch = db.batch()
        for doc in reports:
            batch.delete(doc.reference)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        # Delete user's cleanings
        cleanings = db.collection('cleanings').where('userId', '==', user_id).stream()
        for doc in cleanings:
            batch.delete(doc.reference)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        # Delete user profile if exists
        db.collection('users').document(user_id).delete()
        # Attempt to delete auth user as well so Admin table stays consistent
        try:
            auth.delete_user(user_id)
        except Exception as _:
            pass

        batch.commit()
        
        return {"message": f"Deleted user {user_id} and {count} associated records"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/ngo/{ngo_id}")
async def delete_ngo(ngo_id: str):
    """Delete all data for a single NGO (reports and cleanings)"""
    try:
        count = 0
        
        # Delete NGO's reports
        reports = db.collection('reports').where('userId', '==', ngo_id).stream()
        batch = db.batch()
        for doc in reports:
            batch.delete(doc.reference)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        # Delete NGO's cleanings
        cleanings = db.collection('cleanings').where('userId', '==', ngo_id).stream()
        for doc in cleanings:
            batch.delete(doc.reference)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        
        # Delete NGO profile and auth account
        db.collection('users').document(ngo_id).delete()
        try:
            auth.delete_user(ngo_id)
        except Exception as _:
            pass

        batch.commit()
        
        return {"message": f"Deleted NGO {ngo_id} and {count} associated records"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))