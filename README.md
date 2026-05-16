# What's In Your Fridge?

A playful full-stack AI kitchen assistant that scans fridge photos, detects ingredients, stores pantry inventory, and generates personalized recipes with Ollama.

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Axios
- Backend: FastAPI
- AI: YOLOv8, Hugging Face Transformers, OCR via EasyOCR or Tesseract, Ollama
- Storage: JSON repository with a clean interface for future MongoDB/PostgreSQL adapters

## Run Locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional local AI services:

- Start Ollama: `ollama serve`
- Pull a recipe model: `ollama pull llama3.1`
- Install vision/OCR extras when you want real local detection: `pip install -r requirements-ai.txt`
- Default Hugging Face vision models:
  - `yvelos/beit-food-384` for broad food classification across Food101, UECFood256, and FruitVeg81 labels.
  - `dima806/fruit_vegetable_image_detection` for produce-focused fruit and vegetable classification.
- Override models with `WIYF_HF_IMAGE_MODELS='["model/name","another/model"]'`.
- YOLO/OCR/Hugging Face dependencies are lazy-loaded and gracefully fall back to demo detections when unavailable.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` if your backend uses another host.

## Architecture Notes

- `backend/app/services/detection_service.py` orchestrates YOLO, Hugging Face image classification, OCR, normalization, and fallback detection.
- `backend/app/inventory/json_store.py` is the storage adapter boundary. Replace it with MongoDB/PostgreSQL without changing routes.
- `backend/app/prompts/recipe_prompts.py` keeps recipe prompt generation modular.
- Frontend pages are route-based and share comic-style UI primitives from `frontend/src/components/ui`.

## Bonus Feature Hooks

The app includes routes and UI placeholders for voice input, barcode scanning, expiry tracking, nutrition analysis, shopping lists, meal planning, an AI cooking assistant character, push notifications, and PWA/offline support.
