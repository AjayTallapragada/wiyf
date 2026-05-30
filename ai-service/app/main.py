from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.detection import router as detection_router

app = FastAPI(
    title="What's In Your Fridge? AI Service",
    description="YOLOv8-powered ingredient detection.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
