from fastapi import APIRouter, File, UploadFile

from app.models.schemas import DetectionResponse
from app.services.detection_service import detection_service

router = APIRouter(tags=["detection"])


@router.post("/detect", response_model=DetectionResponse)
async def detect_ingredients(file: UploadFile = File(...)):
    return await detection_service.detect_from_upload(file)
