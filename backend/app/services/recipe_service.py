import json
import re
from typing import Any, Dict, List, Optional

import httpx

from app.models.schemas import Ingredient, Preferences, Recipe, RecipeIngredient, RecipeResponse
from app.prompts.recipe_prompts import build_recipe_prompt
from app.utils.config import settings


class RecipeService:
    async def generate(self, ingredients: List[Ingredient], preferences: Preferences) -> RecipeResponse:
        if self._has_chicken(ingredients):
            api_recipes = await self._fetch_themealdb_recipes(ingredients, preferences)
            if api_recipes:
                return RecipeResponse(recipes=api_recipes, provider="themealdb")
            return RecipeResponse(recipes=self._chicken_recipes(ingredients, preferences), provider="local-chicken")

        if self._has_tomato(ingredients):
            return RecipeResponse(recipes=self._tomato_recipes(ingredients, preferences), provider="local-tomato")

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

    def _has_tomato(self, ingredients: List[Ingredient]) -> bool:
        return any("tomato" in item.name.lower() for item in ingredients)

    def _has_chicken(self, ingredients: List[Ingredient]) -> bool:
        return any("chicken" in item.name.lower() for item in ingredients)

    async def _fetch_themealdb_recipes(self, ingredients: List[Ingredient], preferences: Preferences) -> List[Recipe]:
        names = {item.name.lower() for item in ingredients}
        main_ingredient = "chicken" if "chicken" in names else next(iter(names), "")
        if not main_ingredient:
            return []

        try:
            async with httpx.AsyncClient(timeout=12) as client:
                filtered = await client.get(
                    "https://www.themealdb.com/api/json/v1/1/filter.php",
                    params={"i": main_ingredient},
                )
                filtered.raise_for_status()
                meals = filtered.json().get("meals") or []

                ranked = self._rank_api_meals(meals, names)
                recipes: List[Recipe] = []
                for meal in ranked[:8]:
                    detail = await self._fetch_themealdb_detail(client, meal.get("idMeal"))
                    if not detail:
                        continue
                    recipe = self._themealdb_to_recipe(detail, names, preferences)
                    if recipe:
                        recipes.append(recipe)
                    if len(recipes) == 3:
                        break
                return recipes
        except Exception:
            return []

    async def _fetch_themealdb_detail(self, client: httpx.AsyncClient, meal_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if not meal_id:
            return None
        response = await client.get("https://www.themealdb.com/api/json/v1/1/lookup.php", params={"i": meal_id})
        response.raise_for_status()
        meals = response.json().get("meals") or []
        return meals[0] if meals else None

    def _rank_api_meals(self, meals: List[Dict[str, Any]], ingredient_names: set[str]) -> List[Dict[str, Any]]:
        def score(meal: Dict[str, Any]) -> int:
            title = (meal.get("strMeal") or "").lower()
            return sum(1 for name in ingredient_names if name in title)

        return sorted(meals, key=score, reverse=True)

    def _themealdb_to_recipe(self, meal: Dict[str, Any], pantry_names: set[str], preferences: Preferences) -> Optional[Recipe]:
        title = meal.get("strMeal")
        if not title:
            return None

        recipe_ingredients: List[RecipeIngredient] = []
        used: List[str] = []
        missing: List[str] = []
        for index in range(1, 21):
            ingredient = (meal.get(f"strIngredient{index}") or "").strip()
            measure = (meal.get(f"strMeasure{index}") or "").strip()
            if not ingredient:
                continue
            name = ingredient.lower()
            recipe_ingredients.append(RecipeIngredient(name=ingredient, quantity=measure))
            if any(pantry_name in name or name in pantry_name for pantry_name in pantry_names):
                used.append(ingredient)
            elif len(missing) < 6:
                missing.append(ingredient)

        instructions = self._split_api_instructions(meal.get("strInstructions") or "")
        if not instructions:
            instructions = ["Follow the source recipe instructions from TheMealDB."]

        summary = self._summarize_api_recipe(title, pantry_names, meal)

        return Recipe(
            title=title,
            description=summary,
            cooking_time=min(preferences.cooking_time, 45),
            calories=520 if not preferences.low_calorie else 420,
            protein=42 if preferences.high_protein or "chicken" in pantry_names else 24,
            ingredients=recipe_ingredients,
            ingredients_used=used or sorted(pantry_names),
            missing_ingredients=missing,
            instructions=instructions,
            tags=[meal.get("strCategory") or "recipe", meal.get("strArea") or "global", "api"],
            ai_message="Fetched from TheMealDB API.",
        )

    def _split_api_instructions(self, instructions: str) -> List[str]:
        normalized = re.sub(r"\s+", " ", instructions.replace("\r", "\n")).strip()
        if not normalized:
            return []

        numbered = re.split(r"(?:^|\s)(?:step\s*)?\d+[\).\-\:]\s*", normalized, flags=re.IGNORECASE)
        candidates = [part.strip() for part in numbered if part.strip()]
        if len(candidates) <= 1:
            candidates = re.split(r"(?<=[.!?])\s+(?=[A-Z])", normalized)

        steps: List[str] = []
        current = ""
        for candidate in candidates:
            candidate = candidate.strip(" -")
            if not candidate:
                continue
            if len(current) < 90:
                current = f"{current} {candidate}".strip()
            else:
                steps.append(current)
                current = candidate
            if len(current) >= 140:
                steps.append(current)
                current = ""
            if len(steps) == 8:
                break
        if current and len(steps) < 8:
            steps.append(current)
        return steps[:8]

    def _summarize_api_recipe(self, title: str, pantry_names: set[str], meal: Dict[str, Any]) -> str:
        title_words = title.lower()
        area = (meal.get("strArea") or "").strip()
        category = (meal.get("strCategory") or "").strip().lower()

        if "stew" in title_words:
            mood = "Warm, hearty, and comforting"
        elif "rice" in title_words:
            mood = "Filling, cozy, and easy to serve"
        elif "curry" in title_words:
            mood = "Rich, saucy, and weeknight friendly"
        elif "roast" in title_words or "bake" in title_words:
            mood = "Hot, simple, and oven-ready"
        elif "salad" in title_words:
            mood = "Fresh, light, and quick to toss"
        elif "soup" in title_words:
            mood = "Warm, light, and soothing"
        else:
            mood = "Hot, tasty, and easy to make"

        notes = []
        if "chicken" in pantry_names:
            notes.append("chicken protein")
        elif category:
            notes.append(category)

        if area:
            notes.append(f"{area} flavor")

        return f"{mood} with {' and '.join(notes)}." if notes else f"{mood}."

    def _chicken_recipes(self, ingredients: List[Ingredient], preferences: Preferences) -> List[Recipe]:
        names = [item.name for item in ingredients]
        has_tomato = "tomato" in names
        has_potato = "potato" in names
        base_missing = []
        if not has_tomato:
            base_missing.append("tomato")
        if not has_potato:
            base_missing.append("potato")

        return [
            Recipe(
                title="Tomato Chicken Potato Curry",
                description="A simple one-pot chicken curry built around tomato gravy and soft potatoes.",
                cooking_time=min(preferences.cooking_time, 35),
                calories=520 if not preferences.low_calorie else 410,
                protein=42 if preferences.high_protein else 34,
                ingredients=[
                    RecipeIngredient(name="chicken", quantity="250 g pieces"),
                    RecipeIngredient(name="tomato", quantity="2 medium, chopped"),
                    RecipeIngredient(name="potato", quantity="1 large, cubed"),
                    RecipeIngredient(name="onion", quantity="1 small"),
                    RecipeIngredient(name="garlic", quantity="2 cloves"),
                ],
                ingredients_used=["chicken"] + (["tomato"] if has_tomato else []) + (["potato"] if has_potato else []),
                missing_ingredients=base_missing + [item for item in ["onion", "garlic"] if item not in names],
                instructions=[
                    "Brown chicken pieces in a little oil.",
                    "Add onion, garlic, tomato, and spices, then cook until saucy.",
                    "Add potato cubes and a splash of water.",
                    "Cover and simmer until the chicken is cooked through and potatoes are tender.",
                ],
                tags=["chicken", "tomato", "potato", "dinner"],
                ai_message="Chicken is the protein anchor here.",
            ),
            Recipe(
                title="Sheet Pan Chicken With Tomato Potatoes",
                description="Roasted chicken, potatoes, and tomatoes with crisp edges and minimal cleanup.",
                cooking_time=min(preferences.cooking_time, 40),
                calories=560 if not preferences.low_calorie else 450,
                protein=44,
                ingredients=[
                    RecipeIngredient(name="chicken", quantity="250 g"),
                    RecipeIngredient(name="potato", quantity="2 medium wedges"),
                    RecipeIngredient(name="tomato", quantity="2 medium halves"),
                    RecipeIngredient(name="lemon", quantity="a squeeze"),
                    RecipeIngredient(name="pepper", quantity="to taste"),
                ],
                ingredients_used=["chicken"] + (["tomato"] if has_tomato else []) + (["potato"] if has_potato else []),
                missing_ingredients=base_missing + [item for item in ["lemon", "pepper"] if item not in names],
                instructions=[
                    "Cut potatoes into wedges and tomatoes into halves.",
                    "Season chicken, potatoes, and tomatoes with oil, salt, pepper, and lemon.",
                    "Roast on a hot tray until the chicken is cooked and potatoes are browned.",
                    "Rest the chicken for a few minutes before serving.",
                ],
                tags=["roast", "meal prep", "high protein"],
                ai_message="Good weeknight chicken plan.",
            ),
            Recipe(
                title="Chicken Tomato Potato Stew",
                description="A cozy stew that stretches raw chicken into a filling tomato-potato meal.",
                cooking_time=min(preferences.cooking_time, 45),
                calories=480 if not preferences.low_calorie else 390,
                protein=38,
                ingredients=[
                    RecipeIngredient(name="chicken", quantity="250 g"),
                    RecipeIngredient(name="tomato", quantity="2 medium"),
                    RecipeIngredient(name="potato", quantity="1 large"),
                    RecipeIngredient(name="stock or water", quantity="2 cups"),
                    RecipeIngredient(name="herbs", quantity="as available"),
                ],
                ingredients_used=["chicken"] + (["tomato"] if has_tomato else []) + (["potato"] if has_potato else []),
                missing_ingredients=base_missing + [item for item in ["stock or water", "herbs"] if item not in names],
                instructions=[
                    "Simmer tomato with water or stock to make a light broth.",
                    "Add potato chunks and cook until nearly tender.",
                    "Add chicken pieces and simmer gently until cooked through.",
                    "Season well and finish with herbs if available.",
                ],
                tags=["stew", "chicken", "comfort"],
                ai_message="This keeps chicken juicy and uses the pantry well.",
            ),
        ]

    def _tomato_recipes(self, ingredients: List[Ingredient], preferences: Preferences) -> List[Recipe]:
        names = [item.name for item in ingredients]
        calories = 260 if preferences.low_calorie else 340
        protein_bonus = "paneer" if preferences.diet.value != "vegan" else "tofu"
        return [
            Recipe(
                title="Fresh Tomato Toast",
                description="Juicy chopped tomato piled onto crisp toast with a bright, peppery finish.",
                cooking_time=min(preferences.cooking_time, 10),
                calories=calories,
                protein=10,
                ingredients=[
                    RecipeIngredient(name="tomato", quantity="2 medium, chopped"),
                    RecipeIngredient(name="bread", quantity="2 slices"),
                    RecipeIngredient(name="pepper", quantity="to taste"),
                    RecipeIngredient(name="lemon", quantity="a squeeze"),
                ],
                ingredients_used=["tomato"],
                missing_ingredients=[item for item in ["bread", "pepper", "lemon"] if item not in names],
                instructions=[
                    "Toast the bread until crisp.",
                    "Chop tomato and season it with pepper, salt, and lemon.",
                    "Spoon the tomato over the toast.",
                    "Finish with herbs or a drizzle of oil if you have them.",
                ],
                tags=[preferences.diet.value, "tomato", "quick"],
                ai_message="Tomato spotted. Here is a fast snack idea.",
            ),
            Recipe(
                title="Simple Tomato Curry",
                description="A gentle tomato curry that works with pantry spices and a small protein boost.",
                cooking_time=min(preferences.cooking_time, 25),
                calories=390 if not preferences.low_calorie else 310,
                protein=24 if preferences.high_protein else 16,
                ingredients=[
                    RecipeIngredient(name="tomato", quantity="3 medium, chopped"),
                    RecipeIngredient(name="onion", quantity="1 small"),
                    RecipeIngredient(name="garlic", quantity="2 cloves"),
                    RecipeIngredient(name=protein_bonus, quantity="1 cup"),
                ],
                ingredients_used=["tomato"],
                missing_ingredients=[item for item in ["onion", "garlic", protein_bonus] if item not in names],
                instructions=[
                    "Cook onion and garlic in a little oil until soft.",
                    "Add chopped tomato and simmer until saucy.",
                    f"Fold in {protein_bonus} and cook until warmed through.",
                    "Season with salt, chili, or cumin if available.",
                ],
                tags=[preferences.diet.value, "comfort", "tomato"],
                ai_message="This one turns tomato into dinner.",
            ),
            Recipe(
                title="Tomato Rice Bowl",
                description="A cozy tomato rice bowl with soft vegetables and a tangy finish.",
                cooking_time=min(preferences.cooking_time, 20),
                calories=430 if not preferences.low_calorie else 350,
                protein=14,
                ingredients=[
                    RecipeIngredient(name="tomato", quantity="2 medium"),
                    RecipeIngredient(name="rice", quantity="1 cup cooked"),
                    RecipeIngredient(name="onion", quantity="1/2 small"),
                    RecipeIngredient(name="lemon", quantity="a squeeze"),
                ],
                ingredients_used=["tomato"],
                missing_ingredients=[item for item in ["rice", "onion", "lemon"] if item not in names],
                instructions=[
                    "Saute onion until glossy.",
                    "Add chopped tomato and cook until it breaks down.",
                    "Stir in cooked rice and warm everything together.",
                    "Finish with lemon and herbs if you have them.",
                ],
                tags=["rice bowl", "tomato", "pantry-first"],
                ai_message="Good tomato energy. Cozy bowl deployed.",
            ),
        ]

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
