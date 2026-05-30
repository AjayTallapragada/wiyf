import base64
import json
import urllib.request
import urllib.error
import asyncio
import re
from typing import List
from fastapi import HTTPException, UploadFile

from app.detections.normalizer import categorize, normalize_name
from app.models.schemas import DetectionResponse, DetectedIngredient
from app.utils.config import settings


class IngredientDetectionService:
    def _extract_json_from_text(self, text: str) -> str:
        """Try to find the first JSON object or array in `text` and return it as a string."""
        if not text:
            return text
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
                            return text[start : i + 1]
                    else:
                        break
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if m:
            return m.group(1)
        return text

    async def _detect_with_gemini(self, image_bytes: bytes, mime_type: str, api_key: str, model: str) -> List[DetectedIngredient]:
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        
        prompt = """You are the AI Vision assistant of the "What's In Your Fridge?" recipe app.
Your task is to analyze the provided image (which is a photo of a refrigerator, freezer, pantry, kitchen counter, or grocery items) and detect all edible ingredients, vegetables, fruits, condiments, sauces, meats, grains, beverages, dairy products, or herbs visible.

For each detected ingredient, output a JSON object containing:
- "name": The clean, singular/common name of the ingredient (e.g. "carrot", "milk", "ketchup", "chicken breast", "cheddar cheese", "spinach", "apple"). Keep it simple and lowercase.
- "confidence": A float between 0.0 and 1.0 indicating your confidence that the item is present in the image. Be honest and realistic (usually between 0.6 and 1.0 for clearly visible items).
- "category": One of these exact categories: "vegetable", "fruit", "dairy", "protein", "grain", "beverage", "packaged", "herb", "other".

Rules:
1. Only detect actual ingredients and food items.
2. Ignore cooking utensils, plates, bowls, fridge shelves, drawers, containers, or packaging itself (unless the content of the packaging is clear, e.g. "greek yogurt" or "mayonnaise").
3. Group duplicates or multiple instances (e.g. if there are 3 apples, just list "apple" once with the highest confidence).
4. Be as comprehensive as possible. Look closely for items in jars, shelves, door racks, and produce drawers.

Return the result as a JSON object with a single top-level key "ingredients", containing a list of detected ingredients.
Example output format:
{
  "ingredients": [
    {"name": "carrot", "confidence": 0.95, "category": "vegetable"},
    {"name": "milk", "confidence": 0.9, "category": "dairy"},
    {"name": "mayonnaise", "confidence": 0.8, "category": "packaged"}
  ]
}"""

        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": encoded_image,
                            }
                        },
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        def make_request():
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.read()

        loop = asyncio.get_event_loop()
        raw_resp = await loop.run_in_executor(None, make_request)
        resp_data = json.loads(raw_resp.decode("utf-8"))

        if not isinstance(resp_data, dict):
            return []
            
        candidates = resp_data.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            return []
            
        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        if not text_parts:
            return []
            
        gem_text = "\n".join(text_parts)
        json_text = self._extract_json_from_text(gem_text)
        payload = json.loads(json_text)
        
        ingredients_raw = []
        if isinstance(payload, dict):
            ingredients_raw = payload.get("ingredients") or []
        elif isinstance(payload, list):
            ingredients_raw = payload
            
        detected = []
        valid_categories = {"vegetable", "fruit", "dairy", "protein", "grain", "beverage", "packaged", "herb", "other"}
        
        for item in ingredients_raw:
            if not isinstance(item, dict):
                continue
            raw_name = str(item.get("name") or "").strip()
            if not raw_name:
                continue
            name = normalize_name(raw_name)
            
            confidence = 0.75
            try:
                confidence = float(item.get("confidence", 0.75))
            except Exception:
                pass
                
            category = str(item.get("category") or "").strip().lower()
            if not category or category not in valid_categories:
                category = categorize(name)
                
            detected.append(DetectedIngredient(
                name=name,
                confidence=round(confidence, 4),
                category=category
            ))
            
        return sorted(detected, key=lambda x: (-x.confidence, x.name))

    async def detect_from_upload(self, file: UploadFile) -> DetectionResponse:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image data was uploaded.")

        if not settings.gemini_api_key:
            raise HTTPException(
                status_code=400,
                detail="Gemini API Key is missing. Please set the WIYF_GEMINI_API_KEY environment variable to use image scanning.",
            )

        try:
            model = settings.gemini_model or "gemini-2.5-flash"
            mime = file.content_type or "image/jpeg"
            if not mime.startswith("image/"):
                mime = "image/jpeg"
            ingredients = await self._detect_with_gemini(image_bytes, mime, settings.gemini_api_key, model)
            return DetectionResponse(ingredients=ingredients)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Gemini Vision Scan failed: {str(e)}",
            )


detection_service = IngredientDetectionService()
