from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    # Use the repository-level `data/` directory so stored pantry.json is consistent
    data_dir: Path = Path(__file__).resolve().parents[3] / "data"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ]
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.1"
    hf_image_model: str = "yvelos/beit-food-384"
    hf_image_models: List[str] = [
        "yvelos/beit-food-384",
        "dima806/fruit_vegetable_image_detection",
    ]
    # Absolute path to the bundled YOLO model inside the backend folder
    yolo_model_path: str = str(Path(__file__).resolve().parents[2] / "yolov8n.pt")

    model_config = SettingsConfigDict(env_file=".env", env_prefix="WIYF_")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings


settings = get_settings()
