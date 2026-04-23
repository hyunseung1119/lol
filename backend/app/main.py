from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import (
    DraftMode,
    DraftAnalysisRequest,
    DraftAnalysisResponse,
    HealthResponse,
    MetaResponse,
    RiotStatusResponse,
)
from app.services.champion_catalog import ChampionCatalogService
from app.services.draft_engine import DraftRecommendationEngine
from app.services.draft_explainer import DraftExplainer
from app.services.ollama_client import OllamaClient
from app.services.riot_client import RiotApiClient


champion_catalog_service = ChampionCatalogService()
ollama_client = OllamaClient()
draft_engine = DraftRecommendationEngine()
draft_explainer = DraftExplainer(ollama_client=ollama_client)
riot_client = RiotApiClient()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await champion_catalog_service.ensure_catalog()
    yield
    await ollama_client.close()
    await riot_client.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model=settings.ollama_model,
        riot_api_configured=riot_client.is_configured,
    )


@app.get("/api/meta", response_model=MetaResponse)
async def meta() -> MetaResponse:
    catalog = await champion_catalog_service.ensure_catalog()
    return MetaResponse(
        app_name=settings.app_name,
        patch=settings.current_patch,
        season_label=settings.season_label,
        ddragon_version=catalog.ddragon_version,
        champion_count=len(catalog.champions),
        riot_api_configured=riot_client.is_configured,
        supported_modes=[DraftMode.TOURNAMENT],
    )


@app.get("/api/champions")
async def champions():
    catalog = await champion_catalog_service.ensure_catalog()
    return [champion.model_dump() for champion in catalog.champions]


@app.post("/api/draft/analyze", response_model=DraftAnalysisResponse)
async def analyze_draft(payload: DraftAnalysisRequest) -> DraftAnalysisResponse:
    catalog = await champion_catalog_service.ensure_catalog()
    analysis = draft_engine.analyze(request=payload, catalog=catalog)
    analysis.explanation = await draft_explainer.explain(
        request=payload,
        analysis=analysis,
    )
    return analysis


@app.get("/api/riot/status", response_model=RiotStatusResponse)
async def riot_status() -> RiotStatusResponse:
    return RiotStatusResponse(
        configured=riot_client.is_configured,
        platform_route=settings.riot_platform_route,
        regional_route=settings.riot_regional_route,
        note="개발 키는 보통 24시간 만료입니다. 프로덕션 배포 전에는 Riot production key 또는 승인된 RSO 앱이 필요합니다.",
    )
