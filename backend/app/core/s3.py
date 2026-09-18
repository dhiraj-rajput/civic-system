import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_s3_client = None

def get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    try:
        import boto3
        from botocore.config import Config
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(s3={"addressing_style": "path"}, signature_version="s3v4")
        )
        return _s3_client
    except Exception as e:
        logger.warning(f"Failed to initialize S3 client: {e}")
        return None


SAFE_MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-matroska": ".mkv",
}


def upload_media_file(file_bytes: bytes, original_filename: str, content_type: str) -> str:
    """Uploads a file to Garage S3. Falls back seamlessly to local storage if S3 is unavailable."""
    # Enforce safe whitelisted extension based on content_type, preventing MIME spoofing / Stored XSS
    safe_default_ext = SAFE_MIME_EXTENSIONS.get(content_type, ".bin")
    raw_ext = os.path.splitext(original_filename)[1].lower()
    
    # Only keep user extension if it matches allowed extensions, otherwise use safe default
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".mkv"}
    ext = raw_ext if raw_ext in allowed_exts else safe_default_ext
    unique_name = f"{uuid.uuid4().hex}{ext}"
    
    client = get_s3_client()
    if client:
        try:
            # Ensure bucket exists
            try:
                client.head_bucket(Bucket=settings.s3_bucket)
            except Exception:
                try:
                    client.create_bucket(Bucket=settings.s3_bucket)
                except Exception as b_err:
                    logger.debug(f"Bucket create/check note: {b_err}")

            client.put_object(
                Bucket=settings.s3_bucket,
                Key=unique_name,
                Body=file_bytes,
                ContentType=content_type
            )
            # URL to the object in Garage S3
            return f"{settings.s3_public_url}/{settings.s3_bucket}/{unique_name}"
        except Exception as e:
            logger.warning(f"S3 upload failed ({e}), falling back to local storage.")

    # Fallback to local file store
    os.makedirs(settings.local_storage_dir, exist_ok=True)
    local_path = os.path.join(settings.local_storage_dir, unique_name)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/{unique_name}"
