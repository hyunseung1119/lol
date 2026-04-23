from __future__ import annotations

from typing import Any

import httpx

from app.config import settings


class OllamaClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.ollama_base_url,
            timeout=180.0,
        )

    async def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> str:
        payload: dict[str, Any] = {
            "model": settings.ollama_model,
            "stream": False,
            "options": {"temperature": temperature},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        response = await self._client.post("/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "").strip()

    async def close(self) -> None:
        await self._client.aclose()
