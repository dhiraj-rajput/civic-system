from fastapi import APIRouter, File, HTTPException, UploadFile, status, Depends
from typing import List
from app.core.s3 import upload_media_file
from app.core.deps import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024       # 5 MB
MAX_VIDEO_SIZE = 25 * 1024 * 1024     # 25 MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    content_type = file.content_type or "application/octet-stream"
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_video = content_type in ALLOWED_VIDEO_TYPES

    if not (is_image or is_video):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Only images (JPEG, PNG, WebP) and videos (MP4, WebM) are permitted."
        )

    file_bytes = await file.read()
    size = len(file_bytes)

    if is_image and size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds 5MB limit ({size / (1024 * 1024):.1f}MB)"
        )

    if is_video and size > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video size exceeds 25MB limit ({size / (1024 * 1024):.1f}MB)"
        )

    url = upload_media_file(file_bytes, file.filename or "upload.bin", content_type)

    return {
        "url": url,
        "filename": file.filename,
        "content_type": content_type,
        "size": size,
        "media_type": "video" if is_video else "image"
    }


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    results = []
    for file in files:
        content_type = file.content_type or "application/octet-stream"
        is_image = content_type in ALLOWED_IMAGE_TYPES
        is_video = content_type in ALLOWED_VIDEO_TYPES
        if not (is_image or is_video):
            continue
        file_bytes = await file.read()
        size = len(file_bytes)
        if (is_image and size <= MAX_IMAGE_SIZE) or (is_video and size <= MAX_VIDEO_SIZE):
            url = upload_media_file(file_bytes, file.filename or "upload.bin", content_type)
            results.append({
                "url": url,
                "filename": file.filename,
                "content_type": content_type,
                "size": size,
                "media_type": "video" if is_video else "image"
            })
    return results
