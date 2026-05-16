from typing import List

from app.models.schemas import Ingredient, Preferences


def build_recipe_prompt(ingredients: List[Ingredient], preferences: Preferences) -> str:
    pantry = ", ".join(f"{item.quantity:g} {item.unit} {item.name}" for item in ingredients) or "no ingredients listed"
    goals = [
        preferences.diet.value,
        "high protein" if preferences.high_protein else "",
        "low oil" if preferences.low_oil else "",
        "low calorie" if preferences.low_calorie else "",
        "muscle gain" if preferences.muscle_gain else "",
        "weight loss" if preferences.weight_loss else "",
    ]
    goals_text = ", ".join(goal for goal in goals if goal)
    allergies = ", ".join(preferences.allergies) or "none"
    return f"""
You are a cozy comic-book AI chef for an app called "What's In Your Fridge?".
Use pantry ingredients first and suggest missing ingredients only when necessary.

Pantry: {pantry}
Diet and nutrition goals: {goals_text}
Cuisine: {preferences.cuisine}
Maximum cooking time: {preferences.cooking_time} minutes
Servings: {preferences.servings}
Allergies to avoid: {allergies}

Return strict JSON with this shape:
{{
  "recipes": [
    {{
      "title": "Recipe name",
      "description": "One playful sentence",
      "cooking_time": 20,
      "calories": 420,
      "protein": 28,
      "ingredients": [{{"name": "egg", "quantity": "2"}}],
      "ingredients_used": ["egg"],
      "missing_ingredients": ["black pepper"],
      "instructions": ["Step one", "Step two"],
      "tags": ["high protein"],
      "ai_message": "Protein power!"
    }}
  ]
}}
Create exactly 3 recipes.
""".strip()
