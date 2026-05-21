from typing import List

from app.models.schemas import Ingredient, MealPlanDay, MealPlanResponse, Preferences, Recipe
from app.services.recipe_service import recipe_service


class MealPlanService:
    async def generate(self, ingredients: List[Ingredient], preferences: Preferences) -> MealPlanResponse:
        if self._has_chicken(ingredients):
            recipe_response = await recipe_service.generate(ingredients, preferences)
            return self._chicken_week(ingredients, preferences, recipe_response.recipes, recipe_response.provider)

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

    def _has_chicken(self, ingredients: List[Ingredient]) -> bool:
        return any("chicken" in item.name.lower() for item in ingredients)

    def _chicken_week(
        self,
        ingredients: List[Ingredient],
        preferences: Preferences,
        api_recipes: List[Recipe] | None = None,
        provider: str = "local-chicken",
    ) -> MealPlanResponse:
        names = {item.name.lower() for item in ingredients}
        missing_base = []
        if "tomato" not in names:
            missing_base.append("tomato")
        if "potato" not in names:
            missing_base.append("potato")

        recipes = api_recipes or [
            Recipe(
                title="Tomato Chicken Potato Curry",
                description="Chicken simmered in tomato gravy with tender potatoes.",
                cooking_time=min(preferences.cooking_time, 35),
                calories=520,
                protein=40,
                ingredients=[],
                ingredients_used=["chicken", "tomato", "potato"],
                missing_ingredients=missing_base + ["onion", "garlic"],
                instructions=["Simmer chicken, tomato, and potato until cooked through."],
                tags=["chicken", "tomato", "potato"],
                ai_message="Start the week with the core trio.",
            ),
            Recipe(
                title="Roasted Chicken Potato Tray",
                description="Crisp potatoes, roasted tomatoes, and juicy chicken.",
                cooking_time=min(preferences.cooking_time, 40),
                calories=560,
                protein=44,
                ingredients=[],
                ingredients_used=["chicken", "tomato", "potato"],
                missing_ingredients=missing_base + ["lemon", "pepper"],
                instructions=["Roast seasoned chicken, potato wedges, and tomatoes on one tray."],
                tags=["roast", "high protein"],
                ai_message="Easy cleanup, solid protein.",
            ),
            Recipe(
                title="Chicken Tomato Stew",
                description="A tomato-forward chicken stew with soft potato chunks.",
                cooking_time=min(preferences.cooking_time, 45),
                calories=480,
                protein=38,
                ingredients=[],
                ingredients_used=["chicken", "tomato", "potato"],
                missing_ingredients=missing_base + ["stock", "herbs"],
                instructions=["Simmer chicken with tomato, potato, stock, and herbs."],
                tags=["stew", "comfort"],
                ai_message="Good batch-cook meal.",
            ),
            Recipe(
                title="Chicken Tomato Rice Bowl",
                description="Shredded chicken over rice with quick tomato potatoes.",
                cooking_time=min(preferences.cooking_time, 30),
                calories=590,
                protein=42,
                ingredients=[],
                ingredients_used=["chicken", "tomato", "potato"],
                missing_ingredients=missing_base + ["rice"],
                instructions=["Cook tomato and potato together, then serve with chicken over rice."],
                tags=["bowl", "meal prep"],
                ai_message="Use leftovers without making dinner feel repeated.",
            ),
        ]

        def pick(index: int) -> Recipe:
            return recipes[index % len(recipes)]

        days = [
            ("Monday", pick(0), pick(1), "Boiled egg, fruit, or yogurt"),
            ("Tuesday", pick(2), pick(3), "Roasted chana or cucumber sticks"),
            ("Wednesday", pick(1), pick(0), "Fruit bowl"),
            ("Thursday", pick(3), pick(2), "Yogurt with pepper and salt"),
            ("Friday", pick(0), pick(3), "Tomato slices with lemon"),
            ("Saturday", pick(2), pick(1), "Light soup or fruit"),
            ("Sunday", pick(3), pick(0), "Leftover potato wedges"),
        ]
        plan = [MealPlanDay(day=day, lunch=lunch, dinner=dinner, snack=snack) for day, lunch, dinner, snack in days]
        shopping = sorted({item for recipe in recipes for item in recipe.missing_ingredients})
        return MealPlanResponse(
            days=plan,
            shopping_list=shopping,
            notes=[
                "Chicken is used as the main protein source for the week.",
                "Tomato and potato are repeated intentionally so the plan stays pantry-first.",
                f"Recipe source: {provider}.",
            ],
        )


meal_plan_service = MealPlanService()
