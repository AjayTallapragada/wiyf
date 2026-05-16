from typing import Optional

from fastapi import APIRouter

from app.inventory.json_store import store
from app.models.schemas import MealPlanResponse, RecipeRequest
from app.services.meal_plan_service import meal_plan_service

router = APIRouter(prefix="/meal-plan", tags=["meal-plan"])


@router.post("/generate", response_model=MealPlanResponse)
async def generate_meal_plan(payload: Optional[RecipeRequest] = None):
    pantry = await store.get_pantry()
    preferences = await store.get_preferences()
    ingredients = payload.ingredients if payload and payload.ingredients else pantry.ingredients
    selected_preferences = payload.preferences if payload else preferences
    return await meal_plan_service.generate(ingredients, selected_preferences)
