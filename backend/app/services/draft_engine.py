from __future__ import annotations

from dataclasses import dataclass
from math import exp

from app.config import settings
from app.models import (
    ChampionSummary,
    DraftActionType,
    DraftAnalysisRequest,
    DraftAnalysisResponse,
    PersonaMode,
    RecommendationBreakdown,
    RecommendationItem,
    Role,
    TeamProfile,
    TeamSide,
)
from app.services.champion_catalog import ChampionCatalogPayload


ROLES: tuple[Role, ...] = (
    Role.TOP,
    Role.JUNGLE,
    Role.MID,
    Role.BOTTOM,
    Role.SUPPORT,
)

TAG_ROLE_WEIGHTS: dict[str, dict[Role, float]] = {
    "Fighter": {
        Role.TOP: 0.92,
        Role.JUNGLE: 0.66,
        Role.MID: 0.28,
        Role.BOTTOM: 0.08,
        Role.SUPPORT: 0.20,
    },
    "Tank": {
        Role.TOP: 0.78,
        Role.JUNGLE: 0.74,
        Role.MID: 0.10,
        Role.BOTTOM: 0.02,
        Role.SUPPORT: 0.86,
    },
    "Mage": {
        Role.TOP: 0.24,
        Role.JUNGLE: 0.12,
        Role.MID: 0.94,
        Role.BOTTOM: 0.26,
        Role.SUPPORT: 0.44,
    },
    "Marksman": {
        Role.TOP: 0.18,
        Role.JUNGLE: 0.04,
        Role.MID: 0.30,
        Role.BOTTOM: 0.98,
        Role.SUPPORT: 0.10,
    },
    "Assassin": {
        Role.TOP: 0.24,
        Role.JUNGLE: 0.72,
        Role.MID: 0.90,
        Role.BOTTOM: 0.05,
        Role.SUPPORT: 0.04,
    },
    "Support": {
        Role.TOP: 0.10,
        Role.JUNGLE: 0.05,
        Role.MID: 0.18,
        Role.BOTTOM: 0.18,
        Role.SUPPORT: 1.00,
    },
}

ROLE_OVERRIDES: dict[str, dict[Role, float]] = {
    "Ahri": {Role.MID: 0.96},
    "Alistar": {Role.SUPPORT: 0.97},
    "AurelionSol": {Role.MID: 0.96},
    "Braum": {Role.SUPPORT: 0.98},
    "Caitlyn": {Role.BOTTOM: 0.97},
    "Camille": {Role.TOP: 0.96, Role.JUNGLE: 0.16},
    "DrMundo": {Role.TOP: 0.95, Role.JUNGLE: 0.44},
    "Ezreal": {Role.BOTTOM: 0.95},
    "Gragas": {Role.TOP: 0.72, Role.JUNGLE: 0.78, Role.MID: 0.42, Role.SUPPORT: 0.22},
    "Hwei": {Role.MID: 0.97},
    "Janna": {Role.SUPPORT: 0.97},
    "Jhin": {Role.BOTTOM: 0.98},
    "KaiSa": {Role.BOTTOM: 0.98},
    "Kaisa": {Role.BOTTOM: 0.98},
    "Kalista": {Role.BOTTOM: 0.96},
    "Karma": {Role.SUPPORT: 0.90, Role.MID: 0.68, Role.TOP: 0.36},
    "Khazix": {Role.JUNGLE: 0.96},
    "Leona": {Role.SUPPORT: 0.98},
    "Lucian": {Role.BOTTOM: 0.95, Role.MID: 0.52},
    "Lulu": {Role.SUPPORT: 0.97},
    "Maokai": {Role.JUNGLE: 0.80, Role.SUPPORT: 0.72, Role.TOP: 0.62},
    "Mel": {Role.MID: 0.94, Role.SUPPORT: 0.26},
    "Milio": {Role.SUPPORT: 0.97},
    "Nami": {Role.SUPPORT: 0.98},
    "Nautilus": {Role.SUPPORT: 0.97, Role.JUNGLE: 0.22},
    "Nocturne": {Role.JUNGLE: 0.94, Role.MID: 0.30},
    "Orianna": {Role.MID: 0.95},
    "Poppy": {Role.TOP: 0.82, Role.JUNGLE: 0.78, Role.SUPPORT: 0.40},
    "Rakan": {Role.SUPPORT: 0.98},
    "Rell": {Role.SUPPORT: 0.95, Role.JUNGLE: 0.48},
    "Renata": {Role.SUPPORT: 0.96},
    "Rumble": {Role.TOP: 0.88, Role.JUNGLE: 0.42},
    "Sejuani": {Role.JUNGLE: 0.97, Role.TOP: 0.66},
    "Senna": {Role.SUPPORT: 0.88, Role.BOTTOM: 0.75},
    "Thresh": {Role.SUPPORT: 0.95},
    "Varus": {Role.BOTTOM: 0.94, Role.MID: 0.16},
    "Vi": {Role.JUNGLE: 0.96},
    "Yone": {Role.MID: 0.84, Role.TOP: 0.76},
}

PATCH_PRIORS: dict[str, dict[str, float]] = {
    "26.8": {
        "DrMundo": -0.04,
        "Hwei": 0.03,
        "Karma": 0.04,
        "Lucian": 0.03,
        "Mel": -0.06,
        "Nami": 0.04,
        "Rell": -0.03,
    }
}

TRAIT_OVERRIDES: dict[str, dict[str, float]] = {
    "Alistar": {"engage": 0.94, "frontline": 0.84, "peel": 0.72},
    "Braum": {"peel": 0.92, "frontline": 0.72},
    "Caitlyn": {"poke": 0.88, "scaling": 0.70},
    "DrMundo": {"frontline": 0.93, "scaling": 0.66},
    "Ezreal": {"poke": 0.84, "scaling": 0.64},
    "Hwei": {"poke": 0.82, "pick": 0.58, "scaling": 0.74},
    "Janna": {"peel": 0.94},
    "Karma": {"poke": 0.78, "peel": 0.66},
    "Leona": {"engage": 0.92, "frontline": 0.74},
    "Lucian": {"physical_damage": 0.92, "scaling": 0.60},
    "Maokai": {"engage": 0.86, "frontline": 0.82, "peel": 0.58},
    "Mel": {"magic_damage": 0.94, "poke": 0.76, "scaling": 0.70},
    "Milio": {"peel": 0.90},
    "Nami": {"peel": 0.76, "poke": 0.54},
    "Nautilus": {"engage": 0.92, "frontline": 0.76},
    "Orianna": {"magic_damage": 0.88, "scaling": 0.75},
    "Rakan": {"engage": 0.84, "peel": 0.68},
    "Rell": {"engage": 0.94, "frontline": 0.82},
    "Sejuani": {"engage": 0.88, "frontline": 0.88},
    "Thresh": {"peel": 0.78, "pick": 0.76},
    "Varus": {"poke": 0.76},
    "Vi": {"engage": 0.78, "pick": 0.74},
}


@dataclass(slots=True)
class ChampionProfile:
    champion: ChampionSummary
    role_scores: dict[Role, float]
    physical_damage: float
    magic_damage: float
    frontline: float
    engage: float
    peel: float
    poke: float
    pick: float
    scaling: float


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def logistic(value: float) -> float:
    return 1 / (1 + exp(-value))


class DraftRecommendationEngine:
    def __init__(self) -> None:
        self._profile_cache: dict[str, ChampionProfile] = {}

    def analyze(
        self,
        *,
        request: DraftAnalysisRequest,
        catalog: ChampionCatalogPayload,
    ) -> DraftAnalysisResponse:
        patch = request.patch or settings.current_patch
        champion_map = {champion.id.lower(): champion for champion in catalog.champions}

        blue_profiles = [
            self._profile_for_pick(pick.champion_id, champion_map) for pick in request.blue_picks
        ]
        red_profiles = [
            self._profile_for_pick(pick.champion_id, champion_map) for pick in request.red_picks
        ]

        blue_team = self._aggregate_team_profile(blue_profiles)
        red_team = self._aggregate_team_profile(red_profiles)
        blue_win_rate = self._estimate_blue_win_rate(blue_team, red_team)
        confidence = clamp(
            0.44 + (len(request.blue_picks) + len(request.red_picks)) * 0.05,
            0.44,
            0.82,
        )

        top_picks = self._rank_candidates(
            request=request,
            patch=patch,
            champion_map=champion_map,
            ally_profiles=blue_profiles if request.side_to_act == TeamSide.BLUE else red_profiles,
            enemy_profiles=red_profiles if request.side_to_act == TeamSide.BLUE else blue_profiles,
            current_blue_team=blue_team,
            current_red_team=red_team,
            evaluate_for=request.side_to_act,
            action_type=DraftActionType.PICK,
        )

        defensive_side = TeamSide.RED if request.side_to_act == TeamSide.BLUE else TeamSide.BLUE
        top_bans = self._rank_candidates(
            request=request,
            patch=patch,
            champion_map=champion_map,
            ally_profiles=red_profiles if request.side_to_act == TeamSide.BLUE else blue_profiles,
            enemy_profiles=blue_profiles if request.side_to_act == TeamSide.BLUE else red_profiles,
            current_blue_team=blue_team,
            current_red_team=red_team,
            evaluate_for=defensive_side,
            action_type=DraftActionType.BAN,
        )

        warnings = [
            "현재 승률은 실시간 Riot 집계가 아닌 드래프트 휴리스틱 기반 예상치입니다.",
            "Riot 개발 키를 활용한 데이터 수집 파이프라인을 연결하면 패치·티어별 실측 모델로 확장할 수 있습니다.",
        ]

        return DraftAnalysisResponse(
            patch=patch,
            season_label=settings.season_label,
            ddragon_version=catalog.ddragon_version,
            side_to_act=request.side_to_act,
            action_type=request.action_type,
            suggested_role=request.suggested_role or Role.FLEX,
            persona_mode=request.persona_mode,
            blue_estimated_win_rate=round(blue_win_rate * 100, 1),
            red_estimated_win_rate=round((1 - blue_win_rate) * 100, 1),
            confidence=round(confidence * 100, 1),
            explanation="추천 설명 생성 대기 중",
            top_picks=top_picks,
            top_bans=top_bans,
            blue_profile=blue_team,
            red_profile=red_team,
            warnings=warnings,
        )

    def _rank_candidates(
        self,
        *,
        request: DraftAnalysisRequest,
        patch: str,
        champion_map: dict[str, ChampionSummary],
        ally_profiles: list[ChampionProfile],
        enemy_profiles: list[ChampionProfile],
        current_blue_team: TeamProfile,
        current_red_team: TeamProfile,
        evaluate_for: TeamSide,
        action_type: DraftActionType,
    ) -> list[RecommendationItem]:
        unavailable = {
            champion_id.lower()
            for champion_id in (
                request.blue_bans
                + request.red_bans
                + request.excluded_champions
                + [pick.champion_id for pick in request.blue_picks + request.red_picks]
            )
        }

        scored: list[RecommendationItem] = []
        for champion in champion_map.values():
            if champion.id.lower() in unavailable:
                continue

            profile = self._build_profile(champion)
            role = self._resolve_role(profile, request.suggested_role)
            patch_bias = PATCH_PRIORS.get(patch, {}).get(champion.id, 0.0)
            comfort = 0.09 if champion.id in request.preferred_champions else 0.0
            persona = self._score_persona_fit(
                request.persona_mode,
                champion,
                profile,
                role,
            )

            role_fit = (
                profile.role_scores[role]
                if role != Role.FLEX
                else max(profile.role_scores.values(), default=0.5)
            )
            ally_team = self._aggregate_team_profile(ally_profiles)
            enemy_team = self._aggregate_team_profile(enemy_profiles)

            synergy = self._score_team_need(profile, ally_team, enemy_team)
            counter = self._score_enemy_response(profile, ally_team, enemy_team)

            if action_type == DraftActionType.PICK:
                projected_ally_team = self._aggregate_team_profile([*ally_profiles, profile])
                if evaluate_for == TeamSide.BLUE:
                    projected_blue = projected_ally_team
                    projected_red = current_red_team
                else:
                    projected_blue = current_blue_team
                    projected_red = projected_ally_team
                projected_blue_win_rate = self._estimate_blue_win_rate(projected_blue, projected_red)
                estimated_for_side = (
                    projected_blue_win_rate
                    if evaluate_for == TeamSide.BLUE
                    else 1 - projected_blue_win_rate
                )
            else:
                projected_enemy_team = self._aggregate_team_profile([*ally_profiles, profile])
                if evaluate_for == TeamSide.BLUE:
                    projected_blue = projected_enemy_team
                    projected_red = current_red_team
                else:
                    projected_blue = current_blue_team
                    projected_red = projected_enemy_team
                projected_blue_win_rate = self._estimate_blue_win_rate(projected_blue, projected_red)
                estimated_for_side = (
                    projected_blue_win_rate
                    if evaluate_for == TeamSide.BLUE
                    else 1 - projected_blue_win_rate
                )

            recommendation_score = clamp(
                estimated_for_side * 100
                + role_fit * 12
                + synergy * 8
                + counter * 8
                + patch_bias * 20
                + comfort * 12
                + persona * 10,
                0,
                100,
            )

            reasons = self._build_reason_strings(
                champion=champion,
                role=role,
                role_fit=role_fit,
                synergy=synergy,
                counter=counter,
                patch_bias=patch_bias,
                comfort=comfort,
                persona=persona,
            )
            scored.append(
                RecommendationItem(
                    champion_id=champion.id,
                    champion_name=champion.name,
                    role=role,
                    recommendation_score=round(recommendation_score, 1),
                    estimated_win_rate=round(estimated_for_side * 100, 1),
                    patch_bias=round(patch_bias * 100, 1),
                    reasons=reasons,
                    tags=champion.tags,
                    breakdown=RecommendationBreakdown(
                        role_fit=round(role_fit * 100, 1),
                        synergy=round(synergy * 100, 1),
                        counter=round(counter * 100, 1),
                        patch=round(patch_bias * 100, 1),
                        comfort=round(comfort * 100, 1),
                        persona=round(persona * 100, 1),
                    ),
                )
            )

        ranked = sorted(
            scored,
            key=lambda item: (item.recommendation_score, item.estimated_win_rate),
            reverse=True,
        )
        return ranked[:5]

    def _resolve_role(self, profile: ChampionProfile, requested_role: Role | None) -> Role:
        if requested_role is None or requested_role == Role.FLEX:
            return max(profile.role_scores, key=profile.role_scores.get)
        return requested_role

    def _profile_for_pick(
        self,
        champion_id: str,
        champion_map: dict[str, ChampionSummary],
    ) -> ChampionProfile:
        champion = champion_map[champion_id.lower()]
        return self._build_profile(champion)

    def _build_profile(self, champion: ChampionSummary) -> ChampionProfile:
        cached = self._profile_cache.get(champion.id)
        if cached:
            return cached

        role_scores = {role: 0.05 for role in ROLES}
        for tag in champion.tags:
            for role, weight in TAG_ROLE_WEIGHTS.get(tag, {}).items():
                role_scores[role] += weight

        if champion.stats.attackrange >= 500:
            role_scores[Role.BOTTOM] += 0.12
            role_scores[Role.MID] += 0.06
            role_scores[Role.SUPPORT] += 0.08
        else:
            role_scores[Role.TOP] += 0.06
            role_scores[Role.JUNGLE] += 0.04

        if champion.partype in {"Mana", "Flow"}:
            role_scores[Role.MID] += 0.04
            role_scores[Role.SUPPORT] += 0.02
        if champion.partype in {"None", "Blood Well", "Shield"}:
            role_scores[Role.TOP] += 0.05
            role_scores[Role.JUNGLE] += 0.03

        for role, override in ROLE_OVERRIDES.get(champion.id, {}).items():
            role_scores[role] = override

        for role in ROLES:
            role_scores[role] = clamp(role_scores[role], 0.01, 1.0)

        physical_damage = 0.20
        magic_damage = 0.20
        frontline = 0.14
        engage = 0.16
        peel = 0.14
        poke = 0.12
        pick = 0.12
        scaling = 0.20

        tag_set = set(champion.tags)
        if "Marksman" in tag_set:
            physical_damage += 0.62
            poke += 0.18
            scaling += 0.30
        if "Mage" in tag_set:
            magic_damage += 0.60
            poke += 0.22
            pick += 0.16
            scaling += 0.18
        if "Tank" in tag_set:
            frontline += 0.62
            engage += 0.28
            peel += 0.24
        if "Fighter" in tag_set:
            physical_damage += 0.28
            frontline += 0.22
            engage += 0.16
            scaling += 0.08
        if "Assassin" in tag_set:
            physical_damage += 0.26
            pick += 0.42
            engage += 0.14
        if "Support" in tag_set:
            peel += 0.40
            engage += 0.14

        if champion.stats.attackrange >= 500:
            poke += 0.16
            frontline -= 0.06
        else:
            frontline += 0.06
            engage += 0.06

        defense_factor = (
            champion.info.defense / 10
            + clamp((champion.stats.hp - 600) / 800, -0.1, 0.2)
            + clamp((champion.stats.armor - 30) / 30, -0.1, 0.2)
        )
        attack_factor = champion.info.attack / 10
        magic_factor = champion.info.magic / 10

        physical_damage += attack_factor * 0.16
        magic_damage += magic_factor * 0.16
        frontline += defense_factor * 0.16
        scaling += max(attack_factor, magic_factor) * 0.08

        trait_override = TRAIT_OVERRIDES.get(champion.id, {})
        physical_damage = trait_override.get("physical_damage", physical_damage)
        magic_damage = trait_override.get("magic_damage", magic_damage)
        frontline = trait_override.get("frontline", frontline)
        engage = trait_override.get("engage", engage)
        peel = trait_override.get("peel", peel)
        poke = trait_override.get("poke", poke)
        pick = trait_override.get("pick", pick)
        scaling = trait_override.get("scaling", scaling)

        total_damage = max(physical_damage + magic_damage, 0.2)
        physical_damage = clamp(physical_damage / total_damage, 0.05, 0.95)
        magic_damage = clamp(magic_damage / total_damage, 0.05, 0.95)

        profile = ChampionProfile(
            champion=champion,
            role_scores=role_scores,
            physical_damage=round(clamp(physical_damage, 0.05, 0.95), 4),
            magic_damage=round(clamp(magic_damage, 0.05, 0.95), 4),
            frontline=round(clamp(frontline, 0.08, 1.0), 4),
            engage=round(clamp(engage, 0.05, 1.0), 4),
            peel=round(clamp(peel, 0.05, 1.0), 4),
            poke=round(clamp(poke, 0.05, 1.0), 4),
            pick=round(clamp(pick, 0.05, 1.0), 4),
            scaling=round(clamp(scaling, 0.08, 1.0), 4),
        )
        self._profile_cache[champion.id] = profile
        return profile

    def _aggregate_team_profile(self, profiles: list[ChampionProfile]) -> TeamProfile:
        if not profiles:
            return TeamProfile(
                physical_damage=0.0,
                magic_damage=0.0,
                frontline=0.0,
                engage=0.0,
                peel=0.0,
                poke=0.0,
                pick=0.0,
                scaling=0.0,
            )

        physical_damage = sum(profile.physical_damage for profile in profiles)
        magic_damage = sum(profile.magic_damage for profile in profiles)
        total_damage = max(physical_damage + magic_damage, 0.01)

        return TeamProfile(
            physical_damage=round(physical_damage / total_damage, 3),
            magic_damage=round(magic_damage / total_damage, 3),
            frontline=round(sum(profile.frontline for profile in profiles), 3),
            engage=round(sum(profile.engage for profile in profiles), 3),
            peel=round(sum(profile.peel for profile in profiles), 3),
            poke=round(sum(profile.poke for profile in profiles), 3),
            pick=round(sum(profile.pick for profile in profiles), 3),
            scaling=round(sum(profile.scaling for profile in profiles), 3),
        )

    def _estimate_blue_win_rate(self, blue_team: TeamProfile, red_team: TeamProfile) -> float:
        blue_balance = 1 - abs(blue_team.physical_damage - blue_team.magic_damage)
        red_balance = 1 - abs(red_team.physical_damage - red_team.magic_damage)

        blue_strength = (
            blue_team.frontline * 0.18
            + blue_team.engage * 0.16
            + blue_team.peel * 0.10
            + blue_team.poke * 0.10
            + blue_team.pick * 0.09
            + blue_team.scaling * 0.12
            + blue_balance * 0.35
            + max(0.0, blue_team.engage - red_team.poke * 0.8) * 0.10
            + max(0.0, blue_team.peel - red_team.pick * 0.7) * 0.08
        )
        red_strength = (
            red_team.frontline * 0.18
            + red_team.engage * 0.16
            + red_team.peel * 0.10
            + red_team.poke * 0.10
            + red_team.pick * 0.09
            + red_team.scaling * 0.12
            + red_balance * 0.35
            + max(0.0, red_team.engage - blue_team.poke * 0.8) * 0.10
            + max(0.0, red_team.peel - blue_team.pick * 0.7) * 0.08
        )

        diff = blue_strength - red_strength + 0.08
        return clamp(logistic(diff * 1.6), 0.34, 0.66)

    def _score_team_need(
        self,
        candidate: ChampionProfile,
        ally_team: TeamProfile,
        enemy_team: TeamProfile,
    ) -> float:
        frontline_need = max(0.0, 1.8 - ally_team.frontline) * candidate.frontline * 0.22
        engage_need = max(0.0, 1.6 - ally_team.engage) * candidate.engage * 0.18
        peel_need = max(0.0, enemy_team.engage - ally_team.peel) * candidate.peel * 0.12
        damage_balance_need = (
            max(0.0, 0.18 - abs(ally_team.physical_damage - ally_team.magic_damage))
            * 0.6
        )
        if ally_team.physical_damage > ally_team.magic_damage:
            damage_mix = candidate.magic_damage * 0.12
        else:
            damage_mix = candidate.physical_damage * 0.12

        return clamp(
            frontline_need + engage_need + peel_need + damage_balance_need + damage_mix,
            0.0,
            0.45,
        )

    def _score_enemy_response(
        self,
        candidate: ChampionProfile,
        ally_team: TeamProfile,
        enemy_team: TeamProfile,
    ) -> float:
        anti_poke = max(0.0, enemy_team.poke - ally_team.engage) * candidate.engage * 0.14
        anti_pick = max(0.0, enemy_team.pick - ally_team.peel) * candidate.peel * 0.12
        anti_frontline = enemy_team.frontline * (
            candidate.magic_damage + candidate.physical_damage
        ) * 0.04
        own_follow_up = min(
            candidate.engage + candidate.pick,
            ally_team.engage + ally_team.pick,
        ) * 0.04
        return clamp(anti_poke + anti_pick + anti_frontline + own_follow_up, 0.0, 0.34)

    def _score_persona_fit(
        self,
        persona_mode: PersonaMode,
        champion: ChampionSummary,
        profile: ChampionProfile,
        role: Role,
    ) -> float:
        if persona_mode == PersonaMode.GENERAL:
            return 0.0

        if persona_mode == PersonaMode.NEW:
            ease_bonus = clamp((10 - champion.info.difficulty) / 10, 0.1, 1.0) * 0.10
            stable_role_bonus = profile.role_scores[role] * 0.04
            return clamp(ease_bonus + stable_role_bonus, -0.04, 0.14)

        if persona_mode == PersonaMode.VETERAN:
            flex_bonus = max(profile.role_scores.values()) * 0.03
            poke_or_pick_bonus = max(profile.poke, profile.pick) * 0.04
            return clamp(flex_bonus + poke_or_pick_bonus, 0.0, 0.10)

        if persona_mode == PersonaMode.PRO:
            return clamp(
                profile.engage * 0.04 + profile.scaling * 0.04 + profile.pick * 0.03,
                0.0,
                0.12,
            )

        if persona_mode == PersonaMode.COACH:
            return clamp(
                profile.frontline * 0.04 + profile.peel * 0.04 + profile.engage * 0.03,
                0.0,
                0.12,
            )

        if persona_mode == PersonaMode.DIRECTOR:
            return clamp(
                profile.frontline * 0.05 + profile.scaling * 0.05 + profile.engage * 0.02,
                0.0,
                0.12,
            )

        return 0.0

    def _build_reason_strings(
        self,
        *,
        champion: ChampionSummary,
        role: Role,
        role_fit: float,
        synergy: float,
        counter: float,
        patch_bias: float,
        comfort: float,
        persona: float,
    ) -> list[str]:
        reasons = [f"{role.value} 기준 역할 적합도 {round(role_fit * 100)}점"]
        if synergy >= 0.18:
            reasons.append("현재 우리 조합이 부족한 전면전과 피해 분산을 보완합니다.")
        elif synergy >= 0.10:
            reasons.append("우리 조합의 빈 구간을 무난하게 메워 줍니다.")

        if counter >= 0.16:
            reasons.append("상대 조합의 포킹 또는 이니시에 대응 가치가 높습니다.")
        elif counter >= 0.10:
            reasons.append("상대 조합 상대로 안정적인 반응 각을 만듭니다.")

        if patch_bias >= 0.03:
            reasons.append(f"{settings.current_patch} 패치 기준 우호적인 메타 편향이 있습니다.")
        elif patch_bias <= -0.03:
            reasons.append(f"{settings.current_patch} 패치 기준 밸류가 다소 내려간 챔피언입니다.")

        if comfort > 0:
            reasons.append("선호 챔피언 풀에 포함되어 실행 난도가 낮습니다.")

        if persona >= 0.05:
            reasons.append("현재 선택한 페르소나 기준에서 체감 가치가 높습니다.")

        if len(reasons) == 1:
            reasons.append(f"{champion.name}는 현재 드래프트에서 안정적인 기본값 역할을 합니다.")

        return reasons[:4]
