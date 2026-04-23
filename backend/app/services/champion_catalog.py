from __future__ import annotations

import json
from pathlib import Path

import httpx

from app.config import settings
from app.models import ChampionSummary


class ChampionCatalogPayload:
    def __init__(
        self,
        *,
        ddragon_version: str,
        locale: str,
        champions: list[ChampionSummary],
    ) -> None:
        self.ddragon_version = ddragon_version
        self.locale = locale
        self.champions = champions


class ChampionCatalogService:
    def __init__(self, cache_path: Path | None = None) -> None:
        self._cache_path = cache_path or settings.champion_catalog_path
        self._catalog: ChampionCatalogPayload | None = None

    async def ensure_catalog(self) -> ChampionCatalogPayload:
        if self._catalog is not None:
            return self._catalog

        if self._cache_path.exists():
            self._catalog = self._load_local_catalog()
            return self._catalog

        await self.refresh_catalog()
        return self._catalog

    async def refresh_catalog(self) -> ChampionCatalogPayload:
        url = (
            f"https://ddragon.leagueoflegends.com/cdn/{settings.ddragon_version}"
            f"/data/{settings.ddragon_locale}/champion.json"
        )
        async with httpx.AsyncClient(timeout=settings.ddragon_timeout_seconds) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload = response.json()

        simplified = {
            "ddragon_version": settings.ddragon_version,
            "locale": settings.ddragon_locale,
            "generated_at": "runtime-refresh",
            "champions": sorted(payload["data"].values(), key=lambda champion: champion["id"]),
        }
        self._cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._cache_path.write_text(
            json.dumps(simplified, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self._catalog = self._load_local_catalog()
        return self._catalog

    def _load_local_catalog(self) -> ChampionCatalogPayload:
        raw = json.loads(self._cache_path.read_text(encoding="utf-8-sig"))
        champions = [ChampionSummary.model_validate(champion) for champion in raw["champions"]]
        return ChampionCatalogPayload(
            ddragon_version=raw["ddragon_version"],
            locale=raw["locale"],
            champions=champions,
        )
