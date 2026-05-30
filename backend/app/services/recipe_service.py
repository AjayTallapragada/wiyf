import json
import random
import re
from typing import Any, Dict, List, Optional, Set

import httpx

from app.models.schemas import Ingredient, Preferences, Recipe, RecipeIngredient, RecipeResponse
from app.prompts.recipe_prompts import build_recipe_prompt
from app.utils.config import settings


class RecipeService:
    async def generate(self, ingredients: List[Ingredient], preferences: Preferences, exclude_titles: List[str] = None) -> RecipeResponse:
        # Primary path: try Google Gemini first for all requests when configured.
        prompt = build_recipe_prompt(ingredients, preferences, exclude_titles)
        if settings.gemini_api_key:
            try:
                gem_text = await self._call_gemini(prompt)
                # Models sometimes wrap JSON in extra commentary; try to extract a JSON blob first.
                json_text = self._extract_json_from_text(gem_text)
                payload = json.loads(json_text)
                recipe_dicts = self._extract_recipes_from_payload(payload)
                recipes: List[Recipe] = []
                for item in recipe_dicts:
                    norm = self._normalize_recipe_dict(item, preferences)
                    try:
                        recipes.append(Recipe.model_validate(norm))
                    except Exception:
                        # skip invalid items
                        continue
                filtered_recipes = self._filter_recipes_for_preferences(recipes, preferences)
                if filtered_recipes:
                    return RecipeResponse(recipes=filtered_recipes, provider="gemini")
                
                diet_filtered = [r for r in recipes if self._recipe_matches_preferences_no_time(r, preferences)]
                if diet_filtered:
                    return RecipeResponse(recipes=diet_filtered, provider="gemini")
            except Exception:
                # If Gemini fails, continue to other sources
                pass

        # Special-case: chicken -> try TheMealDB and local chicken recipes
        if preferences.diet.value == "non-vegetarian" and self._has_chicken(ingredients):
            api_recipes = await self._fetch_themealdb_recipes(ingredients, preferences, exclude_titles)
            if api_recipes:
                return RecipeResponse(recipes=api_recipes, provider="themealdb")
            return RecipeResponse(recipes=self._chicken_recipes(ingredients, preferences, exclude_titles), provider="local-chicken")

        if self._has_tomato(ingredients):
            return RecipeResponse(recipes=self._tomato_recipes(ingredients, preferences, exclude_titles), provider="local-tomato")

        # Fallback: previously used Ollama if available
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": settings.ollama_model, "prompt": prompt, "stream": False, "format": "json"},
                )
                response.raise_for_status()
            payload = json.loads(response.json().get("response", "{}"))
            recipe_dicts = self._extract_recipes_from_payload(payload)
            recipes: List[Recipe] = []
            for item in recipe_dicts:
                norm = self._normalize_recipe_dict(item, preferences)
                try:
                    recipes.append(Recipe.model_validate(norm))
                except Exception:
                    continue
            if recipes:
                filtered_recipes = self._filter_recipes_for_preferences(recipes, preferences)
                if filtered_recipes:
                    return RecipeResponse(recipes=filtered_recipes, provider=f"ollama:{settings.ollama_model}")
                diet_filtered = [r for r in recipes if self._recipe_matches_preferences_no_time(r, preferences)]
                if diet_filtered:
                    return RecipeResponse(recipes=diet_filtered, provider=f"ollama:{settings.ollama_model}")
        except Exception:
            pass

        # If everything else fails, return local mock fallback
        return RecipeResponse(recipes=self._fallback_recipes(ingredients, preferences, exclude_titles), provider="local-fallback")

    async def _call_gemini(self, prompt: str) -> str:
        model = settings.gemini_model
        url = f"{settings.gemini_api_base_url}/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key or "",
        }
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.85,
                "topP": 0.9,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json",
                "thinkingConfig": {
                    "thinkingBudget": 0,
                },
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                # Log Gemini request failure for debugging
                try:
                    log_dir = settings.data_dir / "logs"
                    log_dir.mkdir(parents=True, exist_ok=True)
                    with open(log_dir / "gemini_errors.log", "a", encoding="utf-8") as fh:
                        safe_headers = {k: ("configured" if k == "x-goog-api-key" and v else v) for k, v in headers.items()}
                        fh.write(json.dumps({"error": str(e), "url": url, "headers": safe_headers, "body_preview": (prompt[:400] if isinstance(prompt, str) else str(prompt))}, ensure_ascii=False))
                        fh.write("\n---\n")
                except Exception:
                    pass
                raise
        # Log raw response for local debugging
        try:
            log_dir = settings.data_dir / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            with open(log_dir / "gemini_responses.log", "a", encoding="utf-8") as fh:
                fh.write(json.dumps({"request": prompt, "response": data}, ensure_ascii=False))
                fh.write("\n---\n")
        except Exception:
            pass
        # Gemini generateContent returns candidates[].content.parts[].text.
        if isinstance(data.get("candidates"), list) and data["candidates"]:
            cand = data["candidates"][0]
            content = cand.get("content") or {}
            parts = content.get("parts") or []
            text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
            if text_parts:
                return "\n".join(text_parts)
            return cand.get("output") or json.dumps(cand)
        if "output" in data:
            return data["output"]
        # Fallback: stringify
        return json.dumps(data)

    def _has_tomato(self, ingredients: List[Ingredient]) -> bool:
        return any("tomato" in item.name.lower() for item in ingredients)

    def _extract_json_from_text(self, text: str) -> str:
        """Try to find the first JSON object or array in `text` and return it as a string.

        Falls back to returning the original text if no JSON block found (so caller can try parsing).
        """
        if not text:
            return text
        # Search for first { ... } or [ ... ] block by balancing braces
        start = None
        stack = []
        opening = {"{": "}", "[": "]"}
        closing = {"}": "{", "]": "["}
        for i, ch in enumerate(text):
            if ch in opening and start is None:
                start = i
                stack.append(ch)
                continue
            if start is not None:
                if ch in opening:
                    stack.append(ch)
                elif ch in closing:
                    if stack and stack[-1] == closing[ch]:
                        stack.pop()
                        if not stack:
                            # return the balanced JSON substring
                            return text[start : i + 1]
                    else:
                        # Mismatched JSON delimiters; give up.
                        break
        # fallback: attempt to find a JSON-like substring using regex for simple cases
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if m:
            return m.group(1)
        return text

    def _extract_recipes_from_payload(self, payload: Any) -> List[Dict[str, Any]]:
        """Normalise several plausible LLM payload shapes into a list of recipe dicts.

        Accepts: {recipes: [...]}, [...] (list of recipes), single recipe dict
        """
        if not payload:
            return []
        if isinstance(payload, dict):
            if "recipes" in payload and isinstance(payload["recipes"], list):
                return payload["recipes"]
            # sometimes the LLM returns a single recipe dict
            # or nested under other keys
            # try to find a recipes-like key
            for key in ("items", "results", "data"):
                if key in payload and isinstance(payload[key], list):
                    return payload[key]
            # if dict looks like a recipe (has title and instructions), return it as single-item list
            if "title" in payload and "instructions" in payload:
                return [payload]
            return []
        if isinstance(payload, list):
            return payload
        return []

    def _normalize_recipe_dict(self, raw: Dict[str, Any], preferences: Preferences) -> Dict[str, Any]:
        """Coerce a raw recipe dict from an LLM into the expected Recipe schema types.

        This is defensive: it converts numeric strings to ints, ensures lists, and fills missing fields with sensible defaults.
        """
        if not isinstance(raw, dict):
            return {}

        def as_list(value: Any) -> List[str]:
            if value is None:
                return []
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
            if isinstance(value, str):
                return [s.strip() for s in re.split(r"[,;]\s*", value) if s.strip()]
            return [str(value).strip()] if str(value).strip() else []

        def as_int(val, fallback=0):
            try:
                return int(val)
            except Exception:
                try:
                    return int(float(val))
                except Exception:
                    return fallback

        title = str(raw.get("title") or raw.get("name") or "Untitled Recipe")
        description = str(raw.get("description") or "")
        cooking_time = as_int(raw.get("cooking_time") or raw.get("cookingTime") or raw.get("time") or preferences.cooking_time)
        calories = as_int(raw.get("calories") or 0)
        protein = as_int(raw.get("protein") or 0)

        ingredients_raw = raw.get("ingredients") or []
        ingredients: List[Dict[str, Any]] = []
        if isinstance(ingredients_raw, dict):
            # some models output {name: qty}
            for k, v in ingredients_raw.items():
                ingredients.append({"name": k, "quantity": str(v)})
        elif isinstance(ingredients_raw, list):
            for it in ingredients_raw:
                if isinstance(it, str):
                    ingredients.append({"name": it, "quantity": ""})
                elif isinstance(it, dict):
                    ingredients.append({"name": str(it.get("name") or it.get("ingredient") or ""), "quantity": str(it.get("quantity") or it.get("amount") or "")})

        ingredients_used = as_list(raw.get("ingredients_used") or raw.get("ingredientsUsed") or raw.get("used"))
        if not ingredients_used:
            ingredients_used = [i.get("name") for i in ingredients if i.get("name")]
        missing_ingredients = as_list(raw.get("missing_ingredients") or raw.get("missingIngredients") or raw.get("missing"))

        instructions_raw = raw.get("instructions") or raw.get("steps") or []
        instructions: List[str] = []
        if isinstance(instructions_raw, str):
            # split by sentences, keep up to 12 steps
            parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", instructions_raw) if p.strip()]
            instructions = parts[:12]
        elif isinstance(instructions_raw, list):
            instructions = [str(s) for s in instructions_raw][:12]

        tags = as_list(raw.get("tags") or raw.get("labels"))

        ai_message = str(raw.get("ai_message") or raw.get("note") or raw.get("aiMessage") or "")

        return {
            "title": title,
            "description": description,
            "cooking_time": cooking_time,
            "calories": calories,
            "protein": protein,
            "ingredients": ingredients,
            "ingredients_used": ingredients_used,
            "missing_ingredients": missing_ingredients[:6],
            "instructions": instructions or ["Follow the steps in the recipe."],
            "tags": tags,
            "ai_message": ai_message,
        }

    def _filter_recipes_for_preferences(self, recipes: List[Recipe], preferences: Preferences) -> List[Recipe]:
        return [recipe for recipe in recipes if self._recipe_matches_preferences(recipe, preferences)]

    def _recipe_matches_preferences(self, recipe: Recipe, preferences: Preferences) -> bool:
        if recipe.cooking_time > preferences.cooking_time:
            return False
        return self._recipe_matches_preferences_no_time(recipe, preferences)

    def _recipe_matches_preferences_no_time(self, recipe: Recipe, preferences: Preferences) -> bool:
        haystack_parts = [
            recipe.title,
            recipe.description,
            recipe.ai_message,
            " ".join(recipe.instructions),
            " ".join(recipe.tags),
            " ".join(item.name for item in recipe.ingredients),
            " ".join(recipe.ingredients_used),
            " ".join(recipe.missing_ingredients),
        ]
        haystack = self._normalize_food_text(" ".join(haystack_parts))

        for allergy in preferences.allergies:
            if self._contains_food_term(haystack, allergy):
                return False

        if preferences.diet.value == "vegan":
            forbidden = [
                "chicken", "fish", "prawn", "shrimp", "meat", "mutton", "beef", "pork", "egg",
                "milk", "curd", "yogurt", "paneer", "cheese", "butter", "ghee", "cream", "honey",
            ]
            return not any(self._contains_food_term(haystack, item) for item in forbidden)

        if preferences.diet.value == "vegetarian":
            forbidden = ["chicken", "fish", "prawn", "shrimp", "meat", "mutton", "beef", "pork", "egg"]
            return not any(self._contains_food_term(haystack, item) for item in forbidden)

        return True

    def _normalize_food_text(self, value: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()

    def _contains_food_term(self, haystack: str, term: str) -> bool:
        normalized = self._normalize_food_text(term)
        if not normalized:
            return False
        return bool(re.search(rf"(^|\s){re.escape(normalized)}(\s|$)", haystack))

    def _has_chicken(self, ingredients: List[Ingredient]) -> bool:
        return any("chicken" in item.name.lower() for item in ingredients)

    async def _fetch_themealdb_recipes(self, ingredients: List[Ingredient], preferences: Preferences, exclude_titles: List[str] = None) -> List[Recipe]:
        names = {item.name.lower() for item in ingredients}
        main_ingredient = "chicken" if "chicken" in names else next(iter(names), "")
        if not main_ingredient:
            return []

        exclude_set = {t.lower() for t in (exclude_titles or [])}

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
                for meal in ranked[:24]:
                    detail = await self._fetch_themealdb_detail(client, meal.get("idMeal"))
                    if not detail:
                        continue
                    recipe = self._themealdb_to_recipe(detail, names, preferences)
                    if recipe:
                        if recipe.title.lower() in exclude_set:
                            continue
                        recipes.append(recipe)
                    if len(recipes) == 6:
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

    def _rank_api_meals(self, meals: List[Dict[str, Any]], ingredient_names: Set[str]) -> List[Dict[str, Any]]:
        def score(meal: Dict[str, Any]) -> int:
            title = (meal.get("strMeal") or "").lower()
            return sum(1 for name in ingredient_names if name in title)

        return sorted(meals, key=score, reverse=True)

    def _themealdb_to_recipe(self, meal: Dict[str, Any], pantry_names: Set[str], preferences: Preferences) -> Optional[Recipe]:
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
            cooking_time=self._estimate_cooking_time(instructions),
            calories=520 if not preferences.low_calorie else 420,
            protein=42 if preferences.high_protein or "chicken" in pantry_names else 24,
            ingredients=recipe_ingredients,
            ingredients_used=used or sorted(pantry_names),
            missing_ingredients=missing,
            instructions=instructions,
            tags=[meal.get("strCategory") or "recipe", meal.get("strArea") or "global", "api"],
            ai_message="Fetched from TheMealDB API.",
        )

    def _estimate_cooking_time(self, instructions: List[str]) -> int:
        total_minutes = 0
        for step in instructions:
            # 1. Check for hours
            hours = re.findall(r"(\d+)\s*(?:hour|hr)", step, re.IGNORECASE)
            for h in hours:
                total_minutes += int(h) * 60
            # 2. Check for minutes
            mins = re.findall(r"(\d+)\s*(?:minute|min)", step, re.IGNORECASE)
            for m in mins:
                total_minutes += int(m)
        if total_minutes > 0:
            return min(180, max(10, total_minutes))
        return 25

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

    def _summarize_api_recipe(self, title: str, pantry_names: Set[str], meal: Dict[str, Any]) -> str:
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

    def _chicken_recipes(self, ingredients: List[Ingredient], preferences: Preferences, exclude_titles: List[str] = None) -> List[Recipe]:
        names = [item.name for item in ingredients]
        has_tomato = "tomato" in names
        has_potato = "potato" in names
        base_missing = []
        if not has_tomato:
            base_missing.append("tomato")
        if not has_potato:
            base_missing.append("potato")

        exclude_set = {t.lower() for t in (exclude_titles or [])}
        all_recipes = [
            Recipe(
                title="Tomato Chicken Potato Curry",
                description="A simple one-pot chicken curry built around tomato gravy and soft potatoes.",
                cooking_time=35,
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
                cooking_time=40,
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
                cooking_time=45,
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
            Recipe(
                title="Quick Garlic Chicken Breast",
                description="Pan-seared chicken breast loaded with garlic and a squeeze of fresh lemon.",
                cooking_time=20,
                calories=320,
                protein=35,
                ingredients=[
                    RecipeIngredient(name="chicken", quantity="200 g breast"),
                    RecipeIngredient(name="garlic", quantity="3 cloves, crushed"),
                    RecipeIngredient(name="lemon", quantity="1/2"),
                ],
                ingredients_used=["chicken"],
                missing_ingredients=[item for item in ["garlic", "lemon"] if item not in names],
                instructions=[
                    "Slice chicken breast horizontally to make thin cutlets.",
                    "Saute crushed garlic in a splash of oil.",
                    "Add chicken cutlets and sear on high heat for 3-4 minutes per side.",
                    "Deglaze the pan with fresh lemon juice and serve hot.",
                ],
                tags=["chicken", "garlic", "quick"],
                ai_message="Fast, garlicky, and packed with pure protein.",
            ),
            Recipe(
                title="Crispy Pan-Fried Chicken Strips",
                description="Bite-sized chicken strips seasoned and pan-fried for a quick crunch.",
                cooking_time=25,
                calories=410,
                protein=32,
                ingredients=[
                    RecipeIngredient(name="chicken", quantity="200 g strips"),
                    RecipeIngredient(name="cornflour or flour", quantity="2 tbsp"),
                    RecipeIngredient(name="salt and pepper", quantity="to taste"),
                ],
                ingredients_used=["chicken"],
                missing_ingredients=[item for item in ["cornflour or flour", "salt and pepper"] if item not in names],
                instructions=[
                    "Toss chicken strips in flour mixed with salt and pepper.",
                    "Heat oil in a wide skillet.",
                    "Fry chicken strips in a single layer until golden brown on all sides.",
                    "Drain on paper towels and serve with any dip.",
                ],
                tags=["chicken", "crispy", "snack"],
                ai_message="Bite-sized crunch that cooks in a flash.",
            ),
            Recipe(
                title="Comforting Ginger Chicken Soup",
                description="A healing chicken broth simmered with ginger and whatever greens you have.",
                cooking_time=30,
                calories=280,
                protein=26,
                ingredients=[
                    RecipeIngredient(name="chicken", quantity="150 g"),
                    RecipeIngredient(name="ginger", quantity="1 inch slice"),
                    RecipeIngredient(name="water", quantity="3 cups"),
                ],
                ingredients_used=["chicken"],
                missing_ingredients=[item for item in ["ginger", "water"] if item not in names],
                instructions=[
                    "Bring water to a boil with sliced ginger.",
                    "Add chicken pieces and simmer on low heat for 20 minutes.",
                    "Shred chicken and return to the broth.",
                    "Season with salt and pepper and serve warm.",
                ],
                tags=["soup", "chicken", "comfort"],
                ai_message="The ultimate cozy remedy from your pantry.",
            ),
        ]
        random.shuffle(all_recipes)
        filtered = [r for r in all_recipes if r.title.lower() not in exclude_set]
        time_filtered = [r for r in filtered if r.cooking_time <= preferences.cooking_time]
        if time_filtered:
            filtered = time_filtered
        return filtered[:6] if filtered else all_recipes[:6]

    def _tomato_recipes(self, ingredients: List[Ingredient], preferences: Preferences, exclude_titles: List[str] = None) -> List[Recipe]:
        names = [item.name for item in ingredients]
        calories = 260 if preferences.low_calorie else 340
        protein_bonus = "paneer" if preferences.diet.value != "vegan" else "tofu"
        exclude_set = {t.lower() for t in (exclude_titles or [])}
        all_recipes = [
            Recipe(
                title="Fresh Tomato Toast",
                description="Juicy chopped tomato piled onto crisp toast with a bright, peppery finish.",
                cooking_time=10,
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
                cooking_time=25,
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
                cooking_time=20,
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
            Recipe(
                title="Creamy Tomato Soup",
                description="A silky, smooth classic tomato soup to warm up any cold evening.",
                cooking_time=20,
                calories=180,
                protein=4,
                ingredients=[
                    RecipeIngredient(name="tomato", quantity="3 large, chopped"),
                    RecipeIngredient(name="garlic", quantity="2 cloves"),
                    RecipeIngredient(name="butter or olive oil", quantity="1 tbsp"),
                    RecipeIngredient(name="cream or coconut milk", quantity="2 tbsp"),
                ],
                ingredients_used=["tomato"],
                missing_ingredients=[item for item in ["garlic", "butter or olive oil", "cream or coconut milk"] if item not in names],
                instructions=[
                    "Saute garlic in butter or oil until fragrant.",
                    "Add chopped tomatoes and simmer for 12 minutes until fully softened.",
                    "Blend until smooth or mash well.",
                    "Stir in cream or coconut milk, season to taste, and serve hot.",
                ],
                tags=[preferences.diet.value, "soup", "cozy"],
                ai_message="Pure liquid gold from your ripe tomatoes.",
            ),
            Recipe(
                title="Tomato Garlic Pasta",
                description="Simple spaghetti tossed in a quick, aromatic garlic and fresh tomato reduction.",
                cooking_time=20,
                calories=380,
                protein=11,
                ingredients=[
                    RecipeIngredient(name="tomato", quantity="3 medium, cubed"),
                    RecipeIngredient(name="pasta", quantity="150 g"),
                    RecipeIngredient(name="garlic", quantity="3 cloves, sliced"),
                    RecipeIngredient(name="olive oil", quantity="1 tbsp"),
                ],
                ingredients_used=["tomato"],
                missing_ingredients=[item for item in ["pasta", "garlic", "olive oil"] if item not in names],
                instructions=[
                    "Boil pasta in salted water until al dente.",
                    "Gently brown garlic slices in olive oil.",
                    "Add cubed tomatoes and cook until they melt into a light sauce.",
                    "Toss the pasta directly in the tomato sauce and serve.",
                ],
                tags=[preferences.diet.value, "pasta", "quick"],
                ai_message="Italian comfort that uses just a few ingredients.",
            ),
            Recipe(
                title="Tangy Stuffed Tomatoes",
                description="Baked tomato halves loaded with a seasoned rice and herb filling.",
                cooking_time=30,
                calories=290,
                protein=6,
                ingredients=[
                    RecipeIngredient(name="tomato", quantity="3 large"),
                    RecipeIngredient(name="cooked rice", quantity="1/2 cup"),
                    RecipeIngredient(name="herbs", quantity="as available"),
                ],
                ingredients_used=["tomato"],
                missing_ingredients=[item for item in ["cooked rice", "herbs"] if item not in names],
                instructions=[
                    "Cut tops off tomatoes and scoop out the insides.",
                    "Mix scooped pulp with cooked rice, salt, and herbs.",
                    "Stuff the rice mixture back into the tomato shells.",
                    "Bake or pan-cook covered until the tomato skins shrivel slightly.",
                ],
                tags=[preferences.diet.value, "baked", "vegetarian"],
                ai_message="Beautiful, elegant, and uses up leftover rice.",
            ),
        ]
        random.shuffle(all_recipes)
        filtered = [r for r in all_recipes if r.title.lower() not in exclude_set]
        time_filtered = [r for r in filtered if r.cooking_time <= preferences.cooking_time]
        if time_filtered:
            filtered = time_filtered
        return filtered[:6] if filtered else all_recipes[:6]

    def _fallback_recipes(self, ingredients: List[Ingredient], preferences: Preferences, exclude_titles: List[str] = None) -> List[Recipe]:
        names = [item.name for item in ingredients] or ["egg", "tomato", "rice"]
        primary = names[:5]
        protein_bonus = "paneer" if preferences.diet.value != "vegan" else "tofu"
        exclude_set = {t.lower() for t in (exclude_titles or [])}
        all_recipes = [
            Recipe(
                title="Fridge Hero Skillet",
                description="A speedy one-pan rescue mission with crispy edges and cozy flavor.",
                cooking_time=20,
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
                cooking_time=25,
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
                cooking_time=30,
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
            Recipe(
                title="Easy Veggie Fried Rice",
                description="A classic quick stir-fry to transform leftover rice and assorted vegetables.",
                cooking_time=15,
                calories=380,
                protein=8,
                ingredients=[
                    RecipeIngredient(name="cooked rice", quantity="1.5 cups"),
                    RecipeIngredient(name="assorted veg", quantity="1 cup chopped"),
                    RecipeIngredient(name="soy sauce", quantity="1 tbsp"),
                ],
                ingredients_used=[item for item in primary if item in ["rice", "cooked rice"] or "veg" in item],
                missing_ingredients=[item for item in ["cooked rice", "soy sauce"] if item not in names],
                instructions=[
                    "Heat oil in a hot pan or wok.",
                    "Stir-fry chopped veggies until tender-crisp.",
                    "Add leftover rice and toss to break up clumps.",
                    "Drizzle soy sauce, season with salt/pepper, and toss on high heat.",
                ],
                tags=[preferences.diet.value, "rice", "quick"],
                ai_message="Quick skillet action saves the day.",
            ),
            Recipe(
                title="Creamy Mug O' Oats",
                description="Warm, comforting porridge oats cooked with dairy or plant milk.",
                cooking_time=10,
                calories=220,
                protein=7,
                ingredients=[
                    RecipeIngredient(name="rolled oats", quantity="1/2 cup"),
                    RecipeIngredient(name="milk or water", quantity="1 cup"),
                    RecipeIngredient(name="sugar or honey", quantity="1 tsp"),
                ],
                ingredients_used=[item for item in primary if "oat" in item or "milk" in item],
                missing_ingredients=[item for item in ["rolled oats", "milk or water"] if item not in names],
                instructions=[
                    "Combine oats and milk/water in a saucepan or bowl.",
                    "Simmer on low heat for 5 minutes (or microwave for 2 minutes).",
                    "Stir until creamy, sweeten slightly, and top with fruits/nuts if available.",
                ],
                tags=[preferences.diet.value, "breakfast", "easy"],
                ai_message="Warm grains to start the day right.",
            ),
            Recipe(
                title="Pan-Seared Tofu Salad",
                description="Crispy seared tofu cubes tossed with fresh vegetables and dressing.",
                cooking_time=20,
                calories=290,
                protein=19,
                ingredients=[
                    RecipeIngredient(name="tofu", quantity="150 g"),
                    RecipeIngredient(name="salad greens", quantity="1.5 cups"),
                    RecipeIngredient(name="lemon juice", quantity="1 tbsp"),
                ],
                ingredients_used=[item for item in primary if "tofu" in item],
                missing_ingredients=[item for item in ["tofu", "salad greens", "lemon juice"] if item not in names],
                instructions=[
                    "Press tofu to drain water, then cut into cubes.",
                    "Pan-sear tofu cubes in a little oil until golden on all sides.",
                    "Toss seared tofu with salad greens.",
                    "Drizzle dressing or lemon juice, season, and serve.",
                ],
                tags=[preferences.diet.value, "salad", "healthy"],
                ai_message="Crisp, fresh, and high in clean plant protein.",
            ),
        ]
        random.shuffle(all_recipes)
        filtered = [r for r in all_recipes if r.title.lower() not in exclude_set]
        time_filtered = [r for r in filtered if r.cooking_time <= preferences.cooking_time]
        if time_filtered:
            filtered = time_filtered
        return filtered[:6] if filtered else all_recipes[:6]


recipe_service = RecipeService()
