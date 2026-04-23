from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, model_validator


class TeamSide(StrEnum):
    BLUE = "blue"
    RED = "red"


class DraftActionType(StrEnum):
    PICK = "pick"
    BAN = "ban"


class DraftMode(StrEnum):
    TOURNAMENT = "tournament"


class PersonaMode(StrEnum):
    GENERAL = "general"
    PRO = "pro"
    VETERAN = "veteran"
    NEW = "new"
    COACH = "coach"
    DIRECTOR = "director"


class Role(StrEnum):
    TOP = "TOP"
    JUNGLE = "JUNGLE"
    MID = "MID"
    BOTTOM = "BOTTOM"
    SUPPORT = "SUPPORT"
    FLEX = "FLEX"


class ChampionInfo(BaseModel):
    attack: int
    defense: int
    magic: int
    difficulty: int


class ChampionStats(BaseModel):
    hp: float
    hpperlevel: float
    mp: float
    mpperlevel: float
    movespeed: float
    armor: float
    armorperlevel: float
    spellblock: float
    spellblockperlevel: float
    attackrange: float
    hpregen: float
    hpregenperlevel: float
    mpregen: float
    mpregenperlevel: float
    crit: float
    critperlevel: float
    attackdamage: float
    attackdamageperlevel: float
    attackspeedperlevel: float
    attackspeed: float


class ChampionSummary(BaseModel):
    id: str
    key: str
    name: str
    title: str
    tags: list[str] = Field(default_factory=list)
    partype: str
    info: ChampionInfo
    stats: ChampionStats
    image: str


class DraftPickInput(BaseModel):
    champion_id: str
    role: Role | None = None


class DraftAnalysisRequest(BaseModel):
    mode: DraftMode = DraftMode.TOURNAMENT
    patch: str | None = None
    blue_bans: list[str] = Field(default_factory=list, max_length=5)
    red_bans: list[str] = Field(default_factory=list, max_length=5)
    blue_picks: list[DraftPickInput] = Field(default_factory=list, max_length=5)
    red_picks: list[DraftPickInput] = Field(default_factory=list, max_length=5)
    side_to_act: TeamSide = TeamSide.BLUE
    action_type: DraftActionType = DraftActionType.PICK
    suggested_role: Role | None = Role.FLEX
    persona_mode: PersonaMode = PersonaMode.GENERAL
    preferred_champions: list[str] = Field(default_factory=list)
    excluded_champions: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_unique_champions(self) -> "DraftAnalysisRequest":
        picked = [pick.champion_id for pick in self.blue_picks + self.red_picks]
        banned = self.blue_bans + self.red_bans
        all_ids = picked + banned + self.excluded_champions

        lowered = [champion_id.lower() for champion_id in all_ids]
        if len(lowered) != len(set(lowered)):
            raise ValueError("중복된 챔피언이 포함되어 있습니다.")

        return self


class RecommendationBreakdown(BaseModel):
    role_fit: float
    synergy: float
    counter: float
    patch: float
    comfort: float
    persona: float


class RecommendationItem(BaseModel):
    champion_id: str
    champion_name: str
    role: Role
    recommendation_score: float
    estimated_win_rate: float
    patch_bias: float
    reasons: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    breakdown: RecommendationBreakdown


class TeamProfile(BaseModel):
    physical_damage: float
    magic_damage: float
    frontline: float
    engage: float
    peel: float
    poke: float
    pick: float
    scaling: float


class DraftAnalysisResponse(BaseModel):
    patch: str
    season_label: str
    ddragon_version: str
    side_to_act: TeamSide
    action_type: DraftActionType
    suggested_role: Role
    persona_mode: PersonaMode
    blue_estimated_win_rate: float
    red_estimated_win_rate: float
    confidence: float
    explanation: str
    top_picks: list[RecommendationItem] = Field(default_factory=list)
    top_bans: list[RecommendationItem] = Field(default_factory=list)
    blue_profile: TeamProfile
    red_profile: TeamProfile
    warnings: list[str] = Field(default_factory=list)


class MetaResponse(BaseModel):
    app_name: str
    patch: str
    season_label: str
    ddragon_version: str
    champion_count: int
    riot_api_configured: bool
    supported_modes: list[DraftMode]


class HealthResponse(BaseModel):
    status: str
    model: str
    riot_api_configured: bool


class RiotStatusResponse(BaseModel):
    configured: bool
    platform_route: str
    regional_route: str
    note: str
