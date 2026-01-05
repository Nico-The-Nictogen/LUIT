import cloudinary
import cloudinary.uploader
from config import get_settings
import base64
import io
from PIL import Image
import tempfile
import os

settings = get_settings()

print(f"\n🔧 CLOUDINARY CONFIG:")
print(f"   Cloud Name: {settings.cloudinary_cloud_name}")
print(f"   API Key: {'SET' if settings.cloudinary_api_key else 'MISSING'}")
print(f"   API Secret: {'SET' if settings.cloudinary_api_secret else 'MISSING'}\n")

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret
)

async def upload_image_to_cloudinary(image_base64: str, folder: str = "luit") -> dict:
    """
    Upload base64 image to Cloudinary
    """
    try:
        print(f"\n📤 UPLOAD STARTED")
        print(f"   Input size: {len(image_base64) / 1024:.2f} KB")
        
        # Remove data URI prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
            print(f"   Removed data URI prefix")
        
        # Decode base64 to bytes
        print(f"   Decoding base64...")
        image_bytes = base64.b64decode(image_base64)
        print(f"   ✓ Decoded: {len(image_bytes)} bytes")
        
        # Validate image
        print(f"   Validating image...")
        img = Image.open(io.BytesIO(image_bytes))
        print(f"   ✓ Format: {img.format}, Size: {img.size}")
        
        # Save to temp file
        print(f"   Creating temp file...")
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        
        print(f"   ✓ Temp file: {tmp_path}")
        
        # Upload to Cloudinary
        print(f"   Uploading to Cloudinary...")
        result = cloudinary.uploader.upload(
            tmp_path,
            folder=folder,
            resource_type="image"
        )
        
        # Delete temp file
        try:
            os.unlink(tmp_path)
        except:
            pass
        
        print(f"   ✓ Response: {result['public_id']}")
        print(f"   ✓ URL: {result['secure_url']}")
        print(f"✅ UPLOAD SUCCESS\n")
        
        return {
            'success': True,
            'url': result['secure_url'],
            'public_id': result['public_id'],
            'message': 'Image uploaded successfully'
        }
    
    except Exception as e:
        print(f"❌ UPLOAD FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        print()
        return {
            'success': False,
            'url': None,
            'public_id': None,
            'message': f'Upload failed: {str(e)}'
        }

async def delete_image_from_cloudinary(public_id: str) -> dict:
    """Delete image from Cloudinary"""
    try:
        print(f"\n🗑️  DELETING: {public_id}")
        result = cloudinary.uploader.destroy(public_id)
        print(f"✅ DELETED\n")
        
        return {
            'success': True,
            'message': 'Image deleted successfully'
        }
    
    except Exception as e:
        print(f"❌ DELETE FAILED: {str(e)}\n")
        return {
            'success': False,
            'message': f'Delete failed: {str(e)}'
        }

async def get_image_url(public_id: str) -> str:
    """Generate secure URL for Cloudinary image"""
    try:
        url = cloudinary.CloudinaryResource(public_id).build_url(secure=True)
        return url
    except Exception as e:
        return None
