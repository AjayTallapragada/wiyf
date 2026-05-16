from fastapi import APIRouter, File, UploadFile
from typing import Dict

from app.inventory.json_store import store
from app.models.schemas import DetectionResponse, PantryInventory
from app.services.detection_service import detection_service
from app.detections.normalizer import categorize, normalize_name

router = APIRouter(tags=["detection"])


@router.post("/detect", response_model=DetectionResponse)
async def detect_ingredients(file: UploadFile = File(...)):
    result = await detection_service.detect_from_upload(file)
    # Deduplicate detected ingredients by name: keep the item with highest confidence
    dedup: Dict[str, "Ingredient"] = {}
    for ingredient in result.ingredients:
        key = normalize_name(ingredient.name)
        existing = dedup.get(key)
        if existing is None or ingredient.confidence > existing.confidence:
            dedup[key] = ingredient
    # Only return the single ingredient with the highest confidence to reduce noise
    if dedup:
        top = max(dedup.values(), key=lambda i: i.confidence)
        result.ingredients = [top]
    else:
        result.ingredients = []
    pantry = await store.get_pantry()
    existing = {item.name: item for item in pantry.ingredients}

    for ingredient in result.ingredients:
        if ingredient.category == "other":
            ingredient.category = categorize(ingredient.name)
        if ingredient.name in existing:
            current = existing[ingredient.name]
            current.quantity += ingredient.quantity
            current.confidence = max(current.confidence, ingredient.confidence)
            current.source = ingredient.source
            current.raw_label = ingredient.raw_label or current.raw_label
            if current.category == "other":
                current.category = ingredient.category
        else:
            pantry.ingredients.append(ingredient)

    await store.save_pantry(PantryInventory(ingredients=pantry.ingredients))
    return result
