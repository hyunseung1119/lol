from __future__ import annotations

import httpx

from app.config import settings


class RiotApiClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=20.0)

    @property
    def is_configured(self) -> bool:
        return bool(settings.riot_api_key)

    async def get_account_by_riot_id(self, game_name: str, tag_line: str) -> dict:
        return await self._get(
            f"https://{settings.riot_regional_route}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        )

    async def get_match_ids_by_puuid(
        self,
        puuid: str,
        *,
        queue: int = 420,
        count: int = 20,
        start: int = 0,
    ) -> list[str]:
        return await self._get(
            f"https://{settings.riot_regional_route}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?queue={queue}&start={start}&count={count}"
        )

    async def get_match(self, match_id: str) -> dict:
        return await self._get(
            f"https://{settings.riot_regional_route}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        )

    async def get_ranked_entries(self, summoner_id: str) -> list[dict]:
        return await self._get(
            f"https://{settings.riot_platform_route}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"
        )

    async def _get(self, url: str):
        if not settings.riot_api_key:
            raise RuntimeError("RIOT_API_KEY가 설정되지 않았습니다.")

        response = await self._client.get(
            url,
            headers={"X-Riot-Token": settings.riot_api_key},
        )
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
