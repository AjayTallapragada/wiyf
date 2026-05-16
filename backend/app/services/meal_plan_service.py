from typing import List

from app.models.schemas import Ingredient, MealPlanDay, MealPlanResponse, Preferences, Recipe
from app.services.recipe_service import recipe_service


class MealPlanService:
    async def generate(self, ingredients: List[Ingredient], preferences: Preferences) -> MealPlanResponse:
        recipe_response = await recipe_service.generate(ingredients, preferences)
        recipes = recipe_response.recipes
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        plan: List[MealPlanDay] = []
        for index, day in enumerate(days):
            lunch: Recipe = recipes[index % len(recipes)]
            dinner: Recipe = recipes[(index + 1) % len(recipes)]
            plan.append(MealPlanDay(day=day, lunch=lunch, dinner=dinner, snack="Fruit, yogurt, or roasted chana"))
        return MealPlanResponse(
            days=plan,
            shopping_list=sorted({item for recipe in recipes for item in recipe.missing_ingredients}),
            notes=["Pantry ingredients are prioritized first.", "Expiry tracking and nutrition scoring hooks are ready to extend."],
        )


meal_plan_service = MealPlanService()
