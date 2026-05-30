import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, TypeVar, Union

from pydantic import BaseModel

from app.models.schemas import FavoriteRecipe, PantryInventory, Preferences, Recipe
from app.utils.config import settings

T = TypeVar("T", bound=BaseModel)


class JsonStore:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.pantry_path = self.data_dir / "pantry.json"
        self.preferences_path = self.data_dir / "preferences.json"
        self.favorites_path = self.data_dir / "favorites.json"
        self.shared_recipes_path = self.data_dir / "shared_recipes.json"

    def _read_json(self, path: Path, fallback: Union[dict, list]) -> Union[dict, list]:
        if not path.exists():
            return fallback
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _write_json(self, path: Path, payload: Union[dict, list]) -> None:
        with path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2)

    async def get_pantry(self) -> PantryInventory:
        return PantryInventory.model_validate(self._read_json(self.pantry_path, {"ingredients": []}))

    async def save_pantry(self, pantry: PantryInventory) -> PantryInventory:
        pantry.updated_at = datetime.now(timezone.utc).isoformat()
        self._write_json(self.pantry_path, pantry.model_dump())
        return pantry

    async def get_preferences(self) -> Preferences:
        return Preferences.model_validate(self._read_json(self.preferences_path, {}))

    async def save_preferences(self, preferences: Preferences) -> Preferences:
        self._write_json(self.preferences_path, preferences.model_dump())
        return preferences

    async def get_favorites(self) -> List[FavoriteRecipe]:
        data = self._read_json(self.favorites_path, [])
        return [FavoriteRecipe.model_validate(item) for item in data]

    async def save_favorite(self, recipe: Recipe) -> List[FavoriteRecipe]:
        favorites = await self.get_favorites()
        favorites = [item for item in favorites if item.recipe.id != recipe.id]
        favorites.insert(0, FavoriteRecipe(recipe=recipe, saved_at=datetime.now(timezone.utc).isoformat()))
        self._write_json(self.favorites_path, [item.model_dump() for item in favorites])
        return favorites

    async def remove_favorite(self, recipe_id: str) -> List[FavoriteRecipe]:
        favorites = [item for item in await self.get_favorites() if item.recipe.id != recipe_id]
        self._write_json(self.favorites_path, [item.model_dump() for item in favorites])
        return favorites

    async def get_shared_recipe(self, recipe_id: str) -> Recipe:
        from fastapi import HTTPException
        data = self._read_json(self.shared_recipes_path, {})
        recipe_data = data.get(recipe_id)
        if not recipe_data:
            raise HTTPException(status_code=404, detail="Shared recipe not found.")
        return Recipe.model_validate(recipe_data)

    async def save_shared_recipe(self, recipe: Recipe) -> str:
        import re
        from uuid import uuid4
        # Generate a clean slug from the title
        slug = re.sub(r'[^a-z0-9]+', '-', recipe.title.lower()).strip('-')
        recipe_id = f"{slug}-{str(uuid4())[:8]}"
        
        data = self._read_json(self.shared_recipes_path, {})
        data[recipe_id] = recipe.model_dump()
        self._write_json(self.shared_recipes_path, data)
        return recipe_id


store = JsonStore(settings.data_dir)
