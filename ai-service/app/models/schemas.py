from typing import List, Literal

from pydantic import BaseModel, Field

Category = Literal["vegetable", "fruit", "dairy", "protein", "grain", "beverage", "packaged", "herb", "other"]


class DetectedIngredient(BaseModel):
    name: str
    confidence: float = Field(ge=0, le=1)
    category: Category = "other"


class DetectionResponse(BaseModel):
    ingredients: List[DetectedIngredient] = Field(default_factory=list)
