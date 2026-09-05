# What's In Your Fridge?

A full-stack AI kitchen assistant that scans fridge photos, detects ingredients, stores pantry inventory, and generates personalized recipes.

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Axios
- App backend: FastAPI for pantry, preferences, recipes, favorites, and meal planning
- Detection proxy: Spring Boot forwards multipart image uploads to the AI service
- AI service: FastAPI + YOLOv8 + OpenCV for ingredient detection

## Service Layout

- Frontend: `frontend/`
- App backend: `backend/`
- Spring Boot proxy: `backend-spring/`
- AI service: `ai-service/`

## Run Locally

### 1. App backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

### 2. AI service

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8081
```

### 3. Spring Boot proxy

```powershell
cd backend-spring
mvn spring-boot:run
```

The proxy listens on `8082` and forwards `POST /api/detect` to the AI service on `8081`.

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Production Deployment

The backend can be deployed from `backend/` using the Render service in `render.yaml`. Deploy the frontend from `frontend/` with Vercel and configure these build environment variables:

- `VITE_API_BASE_URL=https://<backend-host>/api`
- `VITE_AI_API_BASE_URL=https://<ai-service-host>`

The community tab uses the backend WebSocket endpoint at `/ws/community` and automatically converts the backend URL to `wss://` in production. Keep the backend on a single instance while community messages are stored in memory; use a shared broker or database before scaling horizontally.

## Environment Variables

- `VITE_API_BASE_URL` defaults to `http://127.0.0.1:8080/api`
- `VITE_AI_API_BASE_URL` defaults to `http://127.0.0.1:8082/api`
- `WIYF_GEMINI_API_KEY` enables Gemini recipe generation in the FastAPI backend
- `WIYF_GEMINI_MODEL` defaults to `gemini-2.5-flash`
- `app.ai-service-url` in `backend-spring/src/main/resources/application.yml` defaults to `http://127.0.0.1:8081`

## Detection Flow

1. The user uploads or captures a fridge image on the Scan page.
2. React sends the image as `multipart/form-data` to the Spring Boot proxy.
3. Spring Boot forwards the file to the FastAPI AI service.
4. YOLOv8 runs inference, filters detections below 0.5 confidence, removes duplicates, and maps ingredient categories.
5. The frontend renders detected ingredient chips, then imports them into pantry state when the user clicks Open Pantry.

## Expected API Response

```json
{
  "ingredients": [
    {
      "name": "tomato",
      "confidence": 0.94,
      "category": "vegetable"
    },
    {
      "name": "egg",
      "confidence": 0.91,
      "category": "protein"
    }
  ]
}
```

## Accuracy Improvements Later

- Fine-tune YOLO on fridge-specific ingredient images.
- Add a custom label map that merges more synonyms and brand names.
- Add OCR for packaging and expiration labels.
- Combine detection with segmentation to reduce false positives from reflections and transparent containers.
- Track scan history so repeated detections can reinforce confidence.
- Add a review step for ambiguous detections before they reach pantry state.
