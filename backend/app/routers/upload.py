from fastapi import APIRouter, File, HTTPException, UploadFile, status, Depends
from typing import List
import anyio
from app.core.s3 import upload_media_file
from app.core.deps import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska"}
MAX_IMAGE_SIZE = 15 * 1024 * 1024     # 15 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024     # 50 MB


async def _read_file_safely(file: UploadFile, max_size: int) -> bytes:
    chunk_size = 64 * 1024
    total_bytes = 0
    chunks = []
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum permitted size of {max_size / (1024 * 1024):.0f}MB. Please upload a smaller file."
            )
        chunks.append(chunk)
    return b"".join(chunks)


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

    max_size = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
    file_bytes = await _read_file_safely(file, max_size)
    size = len(file_bytes)

    # Offload blocking boto3 / disk I/O to a worker thread
    url = await anyio.to_thread.run_sync(
        upload_media_file, file_bytes, file.filename or "upload.bin", content_type
    )

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

        max_size = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
        try:
            file_bytes = await _read_file_safely(file, max_size)
        except HTTPException:
            continue

        size = len(file_bytes)
        url = await anyio.to_thread.run_sync(
            upload_media_file, file_bytes, file.filename or "upload.bin", content_type
        )
        results.append({
            "url": url,
            "filename": file.filename,
            "content_type": content_type,
            "size": size,
            "media_type": "video" if is_video else "image"
        })
    return results
