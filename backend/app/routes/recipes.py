from typing import List, Optional

from fastapi import APIRouter

from app.inventory.json_store import store
from app.models.schemas import FeaturePlaceholder, Recipe, RecipeRequest, RecipeResponse
from app.services.recipe_service import recipe_service

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/generate", response_model=RecipeResponse)
async def generate_recipes(payload: Optional[RecipeRequest] = None):
    pantry = await store.get_pantry()
    preferences = await store.get_preferences()
    ingredients = payload.ingredients if payload and payload.ingredients else pantry.ingredients
    selected_preferences = payload.preferences if payload else preferences
    exclude_titles = payload.exclude_titles if payload and payload.exclude_titles else []
    return await recipe_service.generate(ingredients, selected_preferences, exclude_titles)


@router.get("/features", response_model=List[FeaturePlaceholder])
async def feature_placeholders():
    return [
        FeaturePlaceholder(name="voice input", status="prototype"),
        FeaturePlaceholder(name="barcode scanning"),
        FeaturePlaceholder(name="expiry tracking"),
        FeaturePlaceholder(name="nutrition analysis", status="prototype"),
        FeaturePlaceholder(name="shopping list generation", status="prototype"),
        FeaturePlaceholder(name="AI cooking assistant character", status="prototype"),
        FeaturePlaceholder(name="push notifications"),
        FeaturePlaceholder(name="offline PWA support", status="prototype"),
    ]


@router.post("/share", response_model=dict)
async def share_recipe(recipe: Recipe):
    recipe_id = await store.save_shared_recipe(recipe)
    return {"id": recipe_id}


@router.get("/share/{recipe_id}", response_model=Recipe)
async def get_shared_recipe(recipe_id: str):
    return await store.get_shared_recipe(recipe_id)
