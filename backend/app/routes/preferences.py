from fastapi import APIRouter

from app.inventory.json_store import store
from app.models.schemas import Preferences

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("", response_model=Preferences)
async def get_preferences():
    return await store.get_preferences()


@router.put("", response_model=Preferences)
async def save_preferences(preferences: Preferences):
    return await store.save_preferences(preferences)
