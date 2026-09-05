from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import community, detection, favorites, meal_planner, pantry, preferences, recipes
from app.utils.config import settings

app = FastAPI(
    title="What's In Your Fridge? API",
    description="AI-powered pantry detection and recipe generation.",
    version="1.0.0",
)

# CORS must be added before route handlers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router, prefix="/api")
app.include_router(pantry.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(meal_planner.router, prefix="/api")
app.include_router(community.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "AI Chef is sharpening the spatula."}
