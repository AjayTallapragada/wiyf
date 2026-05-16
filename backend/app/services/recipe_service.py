import json
from typing import List

import httpx

from app.models.schemas import Ingredient, Preferences, Recipe, RecipeIngredient, RecipeResponse
from app.prompts.recipe_prompts import build_recipe_prompt
from app.utils.config import settings


class RecipeService:
    async def generate(self, ingredients: List[Ingredient], preferences: Preferences) -> RecipeResponse:
        prompt = build_recipe_prompt(ingredients, preferences)
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": settings.ollama_model, "prompt": prompt, "stream": False, "format": "json"},
                )
                response.raise_for_status()
            payload = json.loads(response.json().get("response", "{}"))
            recipes = [Recipe.model_validate(item) for item in payload.get("recipes", [])]
            if recipes:
                return RecipeResponse(recipes=recipes, provider=f"ollama:{settings.ollama_model}")
        except Exception:
            pass

        return RecipeResponse(recipes=self._fallback_recipes(ingredients, preferences), provider="local-fallback")

    def _fallback_recipes(self, ingredients: List[Ingredient], preferences: Preferences) -> List[Recipe]:
        names = [item.name for item in ingredients] or ["egg", "tomato", "rice"]
        primary = names[:5]
        protein_bonus = "paneer" if preferences.diet.value != "vegan" else "tofu"
        return [
            Recipe(
                title="Fridge Hero Skillet",
                description="A speedy one-pan rescue mission with crispy edges and cozy flavor.",
                cooking_time=min(preferences.cooking_time, 20),
                calories=430 if not preferences.low_calorie else 330,
                protein=32 if preferences.high_protein else 22,
                ingredients=[RecipeIngredient(name=name, quantity="as available") for name in primary],
                ingredients_used=primary,
                missing_ingredients=["pepper", "lemon"] if "lemon" not in names else ["pepper"],
                instructions=[
                    "Chop the vegetables and warm a heavy pan over medium heat.",
                    "Add a small splash of oil, then cook firmer ingredients first.",
                    f"Fold in {protein_bonus} or another protein for a filling finish.",
                    "Season, brighten with lemon, and serve hot.",
                ],
                tags=[preferences.diet.value, "pantry-first"],
                ai_message="You can cook this in 15 mins!",
            ),
            Recipe(
                title="Notebook Pantry Bowl",
                description="A balanced bowl that turns fridge odds and ends into lunchbox gold.",
                cooking_time=min(preferences.cooking_time, 25),
                calories=510 if not preferences.low_calorie else 390,
                protein=28,
                ingredients=[RecipeIngredient(name=name, quantity="1 portion") for name in primary],
                ingredients_used=primary,
                missing_ingredients=["yogurt dressing"] if preferences.diet.value != "vegan" else ["tahini dressing"],
                instructions=[
                    "Build a warm base with rice, oats, or any grain you have.",
                    "Saute vegetables until glossy and tender.",
                    "Top with protein, herbs, and a tangy dressing.",
                    "Taste once more and add crunch if you have nuts or seeds.",
                ],
                tags=["meal prep", "balanced"],
                ai_message="Healthy and tasty!",
            ),
            Recipe(
                title="Sticker Soup Surprise",
                description="A doodle-worthy soup for cleaning out the fridge without feeling like it.",
                cooking_time=min(preferences.cooking_time, 30),
                calories=310,
                protein=18,
                ingredients=[RecipeIngredient(name=name, quantity="roughly chopped") for name in primary],
                ingredients_used=primary,
                missing_ingredients=["stock cube", "garlic"],
                instructions=[
                    "Simmer chopped ingredients with water or stock until tender.",
                    "Mash a few pieces against the pot for body.",
                    "Season gently, then finish with herbs or a spoon of yogurt.",
                    "Serve with toast, rice, or crackers.",
                ],
                tags=["low oil", "comfort"],
                ai_message="Nice combo!",
            ),
        ]


recipe_service = RecipeService()
