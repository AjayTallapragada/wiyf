from typing import List

from fastapi import APIRouter

from app.inventory.json_store import store
from app.models.schemas import FavoriteRecipe, Recipe

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=List[FavoriteRecipe])
async def get_favorites():
    return await store.get_favorites()


@router.post("", response_model=List[FavoriteRecipe])
async def save_favorite(recipe: Recipe):
    return await store.save_favorite(recipe)


@router.delete("/{recipe_id}", response_model=List[FavoriteRecipe])
async def remove_favorite(recipe_id: str):
    return await store.remove_favorite(recipe_id)
