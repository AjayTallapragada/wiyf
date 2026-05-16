from fastapi import APIRouter

from app.detections.normalizer import categorize, normalize_name
from app.inventory.json_store import store
from app.models.schemas import Ingredient, ManualIngredientRequest, PantryInventory

router = APIRouter(prefix="/pantry", tags=["pantry"])


@router.get("", response_model=PantryInventory)
async def get_pantry():
    return await store.get_pantry()


@router.put("", response_model=PantryInventory)
async def update_pantry(pantry: PantryInventory):
    pantry.ingredients = [item.model_copy(update={"name": normalize_name(item.name)}) for item in pantry.ingredients]
    return await store.save_pantry(pantry)


@router.post("/ingredients", response_model=PantryInventory)
async def add_ingredient(payload: ManualIngredientRequest):
    pantry = await store.get_pantry()
    name = normalize_name(payload.name)
    pantry.ingredients.append(
        Ingredient(
            name=name,
            category=payload.category if payload.category != "other" else categorize(name),
            quantity=payload.quantity,
            unit=payload.unit,
            confidence=1,
            source="manual",
        )
    )
    return await store.save_pantry(pantry)


@router.delete("/ingredients/{ingredient_id}", response_model=PantryInventory)
async def delete_ingredient(ingredient_id: str):
    pantry = await store.get_pantry()
    pantry.ingredients = [item for item in pantry.ingredients if item.id != ingredient_id]
    return await store.save_pantry(pantry)
