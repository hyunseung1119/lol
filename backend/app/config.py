from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent


def read_csv_env(name: str, default: list[str]) -> list[str]:
    raw_value = os.getenv(name)
    if not raw_value:
        return default
    return [item.strip() for item in raw_value.split(",") if item.strip()]


class Settings(BaseModel):
    app_name: str = "LoL Draft Lab API"
    app_env: str = Field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    ollama_base_url: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    )
    ollama_model: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL", "gemma4:e4b")
    )
    current_patch: str = Field(default_factory=lambda: os.getenv("LOL_LIVE_PATCH", "26.8"))
    season_label: str = Field(
        default_factory=lambda: os.getenv("LOL_SEASON_LABEL", "2026 시즌 1")
    )
    ddragon_version: str = Field(
        default_factory=lambda: os.getenv("LOL_DDRAGON_VERSION", "16.8.1")
    )
    ddragon_locale: str = Field(
        default_factory=lambda: os.getenv("LOL_DDRAGON_LOCALE", "ko_KR")
    )
    ddragon_timeout_seconds: float = 20.0
    champion_catalog_path: Path = BASE_DIR / "data" / "champion_catalog_ko_KR.json"
    riot_api_key: str | None = Field(default_factory=lambda: os.getenv("RIOT_API_KEY"))
    riot_platform_route: str = Field(
        default_factory=lambda: os.getenv("RIOT_PLATFORM_ROUTE", "kr")
    )
    riot_regional_route: str = Field(
        default_factory=lambda: os.getenv("RIOT_REGIONAL_ROUTE", "asia")
    )
    frontend_origins: list[str] = Field(
        default_factory=lambda: read_csv_env(
            "FRONTEND_ORIGINS",
            ["http://localhost:5173", "http://127.0.0.1:5173"],
        )
    )


settings = Settings()
