#!/usr/bin/env python3
"""Test Cloudinary connection"""

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import os

load_dotenv()

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

print("🧪 CLOUDINARY CONNECTION TEST\n")
print(f"Cloud Name: {cloud_name}")
print(f"API Key: {api_key}")
print(f"API Secret: {api_secret[:10]}...\n")

cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret
)

try:
    print("⏳ Testing connection...")
    # Create a simple test image
    import io
    from PIL import Image
    import base64
    
    # Create a small test image
    img = Image.new('RGB', (100, 100), color='red')
    img_io = io.BytesIO()
    img.save(img_io, format='JPEG')
    img_data = img_io.getvalue()
    
    print(f"📤 Uploading test image ({len(img_data)} bytes)...")
    
    result = cloudinary.uploader.upload(
        io.BytesIO(img_data),
        public_id="luit_test_image",
        folder="luit/test"
    )
    
    print(f"✅ SUCCESS!")
    print(f"\n📊 Response:")
    print(f"   Public ID: {result['public_id']}")
    print(f"   URL: {result['secure_url']}")
    print(f"   Size: {result['bytes']} bytes")
    
    # Clean up
    print(f"\n🗑️  Cleaning up test image...")
    cloudinary.uploader.destroy(result['public_id'])
    print(f"✅ Test image deleted")
    
    print(f"\n✅ ALL TESTS PASSED - Cloudinary is working!")
    
except Exception as e:
    print(f"❌ FAILED: {str(e)}")
    import traceback
    traceback.print_exc()
