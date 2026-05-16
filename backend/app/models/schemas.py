from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


Category = Literal["vegetable", "fruit", "dairy", "protein", "grain", "beverage", "packaged", "herb", "other"]


class Ingredient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    category: Category = "other"
    quantity: float = 1
    unit: str = "item"
    confidence: float = Field(default=0.75, ge=0, le=1)
    source: Literal["vision", "ocr", "manual", "recipe", "demo"] = "manual"
    raw_label: Optional[str] = None


class PantryInventory(BaseModel):
    ingredients: List[Ingredient] = Field(default_factory=list)
    updated_at: Optional[str] = None


class ManualIngredientRequest(BaseModel):
    name: str
    category: Category = "other"
    quantity: float = 1
    unit: str = "item"


class DietType(str, Enum):
    vegetarian = "vegetarian"
    non_vegetarian = "non-vegetarian"
    vegan = "vegan"


class Preferences(BaseModel):
    diet: DietType = DietType.vegetarian
    high_protein: bool = False
    low_oil: bool = False
    low_calorie: bool = False
    muscle_gain: bool = False
    weight_loss: bool = False
    cuisine: str = "surprise me"
    cooking_time: int = Field(default=30, ge=5, le=180)
    servings: int = Field(default=2, ge=1, le=12)
    allergies: List[str] = Field(default_factory=list)


class RecipeIngredient(BaseModel):
    name: str
    quantity: str = ""


class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    description: str
    cooking_time: int
    calories: int
    protein: int
    ingredients: List[RecipeIngredient]
    ingredients_used: List[str]
    missing_ingredients: List[str] = Field(default_factory=list)
    instructions: List[str]
    tags: List[str] = Field(default_factory=list)
    ai_message: str = "Nice combo!"


class RecipeRequest(BaseModel):
    ingredients: List[Ingredient] = Field(default_factory=list)
    preferences: Preferences = Field(default_factory=Preferences)


class RecipeResponse(BaseModel):
    recipes: List[Recipe]
    provider: str
    pantry_first: bool = True


class DetectionResponse(BaseModel):
    ingredients: List[Ingredient]
    ocr_text: List[str] = Field(default_factory=list)
    provider_status: Dict[str, str] = Field(default_factory=dict)
    message: str


class FavoriteRecipe(BaseModel):
    recipe: Recipe
    saved_at: str


class MealPlanDay(BaseModel):
    day: str
    breakfast: Optional[Recipe] = None
    lunch: Recipe
    dinner: Recipe
    snack: str = "Fruit or yogurt bowl"


class MealPlanResponse(BaseModel):
    days: List[MealPlanDay]
    shopping_list: List[str]
    notes: List[str]


class FeaturePlaceholder(BaseModel):
    name: str
    status: Literal["planned", "prototype", "ready"] = "planned"
    metadata: Dict[str, Any] = Field(default_factory=dict)
