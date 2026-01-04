import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from dotenv import load_dotenv

load_dotenv()

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dtiji2s4k"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "433893314248796"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "4Uj51eHZ9_MQRr1LVSHP1H2dRLk"),
    secure=True
)

def upload_image(file_data: bytes, folder: str = "bilagh_reports") -> dict:
    """
    Upload an image to Cloudinary with compression and optimization.
    
    Args:
        file_data: Image file data as bytes
        folder: Cloudinary folder to store images
        
    Returns:
        dict with 'url' and 'public_id' keys
    """
    try:
        result = cloudinary.uploader.upload(
            file_data,
            folder=folder,
            # Compression and optimization settings
            transformation=[
                {
                    "quality": "auto:good",  # Auto quality optimization
                    "fetch_format": "auto",  # Auto format (WebP, AVIF, etc.)
                },
                {
                    "width": 1200,  # Max width
                    "height": 1200,  # Max height
                    "crop": "limit",  # Don't upscale, only downscale
                }
            ],
            # Additional options
            resource_type="image",
            overwrite=True,
            invalidate=True,
        )
        
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }
    except Exception as e:
        raise Exception(f"Failed to upload image: {str(e)}")

def delete_image(public_id: str) -> bool:
    """Delete an image from Cloudinary."""
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception:
        return False
