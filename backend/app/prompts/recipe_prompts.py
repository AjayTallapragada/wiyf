from typing import List

from app.models.schemas import Ingredient, Preferences
from app.utils.config import settings


def build_recipe_prompt(ingredients: List[Ingredient], preferences: Preferences, exclude_titles: List[str] = None) -> str:
    pantry = ", ".join(f"{item.quantity:g} {item.unit} {item.name}" for item in ingredients) or "no ingredients listed"
    goals = [
        preferences.diet.value,
        "high protein" if preferences.high_protein else "",
        "low oil" if preferences.low_oil else "",
        "low calorie" if preferences.low_calorie else "",
        "muscle gain" if preferences.muscle_gain else "",
        "weight loss" if preferences.weight_loss else "",
    ]
    goals_text = ", ".join(goal for goal in goals if goal) or "balanced"
    cuisine = (preferences.cuisine or "surprise me").strip()
    allergies = ", ".join(preferences.allergies) or "none"
    persona = settings.chef_persona or "funny, interactive, pantry-first"
    diet_rules = {
        "vegan": "No meat, seafood, eggs, dairy, ghee, butter, paneer, cheese, yogurt, cream, or honey.",
        "vegetarian": "No meat, seafood, chicken, fish, or eggs. Dairy is allowed.",
        "non-vegetarian": "Meat, seafood, and eggs are allowed, but still prefer pantry ingredients first.",
    }
    goal_rules = [
        "Include a meaningful protein source" if preferences.high_protein else "",
        "Prefer higher calories and protein for muscle gain" if preferences.muscle_gain else "",
        "Keep calories lighter and portions filling for weight loss" if preferences.weight_loss else "",
        "Use minimal oil; do not deep fry" if preferences.low_oil else "",
        "Keep calories low; prefer steaming, sauteing, boiling, roasting, or pressure cooking" if preferences.low_calorie else "",
    ]
    goal_rules_text = "\n".join(f"- {rule}" for rule in goal_rules if rule) or "- Keep the meal balanced."
    cuisine_examples = {
        "indian": "Aloo Pulao, Tomato Rice, Aloo Tamatar Curry, Khichdi, Paneer Bhurji",
        "north indian": "Aloo Tamatar Curry, Jeera Rice, Rajma, Chana Masala, Paneer Bhurji",
        "south indian": "Tomato Rice, Lemon Rice, Vegetable Upma, Sambar Rice, Potato Poriyal",
        "italian": "Risotto al Pomodoro, Pasta al Pomodoro, Patate al Pomodoro, Minestrone, Bruschetta al Pomodoro",
        "mexican": "Arroz Rojo, Papas a la Mexicana, Tacos de Papa, Sopa de Arroz, Pico de Gallo",
        "thai": "Khao Pad, Tom Yum, Pad Pak, Thai Basil Rice, Gaeng Jued",
        "mediterranean": "Greek Lemon Rice, Patatas Bravas, Shakshuka, Fasolakia, Tomato Rice Pilaf",
    }
    cuisine_key = cuisine.lower()
    dish_examples = cuisine_examples.get(cuisine_key, "real, commonly recognized dishes from the selected cuisine")
    cuisine_instruction = (
        "Any real/common dish name is acceptable."
        if cuisine_key == "surprise me"
        else f"Use real/common dish names from {cuisine}. Good examples include: {dish_examples}."
    )
    
    exclude_instruction = ""
    if exclude_titles:
        exclude_instruction = f"\nCRITICAL: Do NOT generate any of the following recipes: {', '.join(exclude_titles)}. You MUST create completely different recipes."

    return f"""
You are a {persona} comic-book AI chef for an app called "What's In Your Fridge?". Speak with a {persona} tone: funny, concise, useful, and a little dramatic about leftovers. Use pantry ingredients first and suggest missing ingredients only when necessary.

IMPORTANT: Return only valid JSON (no commentary, no markdown fences). The JSON must match the schema exactly. If you cannot produce valid JSON, return an empty object: {{}}.
Recipe titles must be real, commonly recognized dish names. Do not invent cartoon, dramatic, or joke recipe titles. {cuisine_instruction} Keep humor only in description and ai_message.
Diet rules are mandatory. Allergy rules are mandatory. Never include an allergic ingredient in ingredients, missing_ingredients, instructions, title, description, tags, or ai_message.
Respect the maximum cooking time. Every recipe's cooking_time must be less than or equal to {preferences.cooking_time}.
Use the serving count when writing ingredient quantities.
Keep missing_ingredients short: at most 6 realistic items, and never list pantry ingredients as missing.
If cuisine is not "surprise me", every recipe must clearly belong to the selected cuisine. Do not return dishes from another cuisine. Do not mix unrelated cuisines unless the selected cuisine is "surprise me".

Pantry: {pantry}
Diet and nutrition goals: {goals_text}
Cuisine: {cuisine}
Maximum cooking time: {preferences.cooking_time} minutes
Servings: {preferences.servings}
Allergies to avoid: {allergies}
Diet constraint: {diet_rules.get(preferences.diet.value, "Follow the selected diet strictly.")}
Goal constraints:
{goal_rules_text}
{exclude_instruction}

Return strict JSON with this shape:
{{
  "recipes": [
    {{
      "title": "Real common dish name",
      "description": "One playful sentence",
      "cooking_time": 20,
      "calories": 420,
      "protein": 28,
      "ingredients": [{{"name": "egg", "quantity": "2"}}],
      "ingredients_used": ["egg"],
      "missing_ingredients": ["black pepper"],
      "instructions": ["Step one", "Step two"],
      "tags": ["high protein"],
      "ai_message": "A short funny chef-bot line about this recipe"
    }}
  ]
}}
Create exactly 6 recipes.
""".strip()
