from __future__ import annotations

from app.models import DraftActionType, DraftAnalysisRequest, DraftAnalysisResponse
from app.services.ollama_client import OllamaClient


class DraftExplainer:
    def __init__(self, *, ollama_client: OllamaClient) -> None:
        self._ollama_client = ollama_client

    async def explain(
        self,
        *,
        request: DraftAnalysisRequest,
        analysis: DraftAnalysisResponse,
    ) -> str:
        primary_pick = analysis.top_picks[0] if analysis.top_picks else None
        primary_ban = analysis.top_bans[0] if analysis.top_bans else None

        if primary_pick is None and primary_ban is None:
            return "추천을 생성할 수 있는 후보가 없습니다."

        system_prompt = (
            "당신은 리그 오브 레전드 코치이자 제품형 분석가다. "
            "숫자와 드래프트 맥락만을 바탕으로 한국어 설명을 짧고 단정하게 작성한다. "
            "추론 과정을 장황하게 노출하지 말고, 4문장 이내로 답한다."
        )
        user_prompt = f"""
현재 드래프트를 설명해줘.

- 대상 페르소나: {request.persona_mode.value}
- 우리 턴: {request.side_to_act.value} / {request.action_type.value}
- 추천 포지션: {(request.suggested_role or 'FLEX')}
- 블루 예상 승률: {analysis.blue_estimated_win_rate}%
- 레드 예상 승률: {analysis.red_estimated_win_rate}%
- 블루 프로필: {analysis.blue_profile.model_dump()}
- 레드 프로필: {analysis.red_profile.model_dump()}
- 1순위 픽 추천: {primary_pick.model_dump() if primary_pick else '없음'}
- 1순위 밴 추천: {primary_ban.model_dump() if primary_ban else '없음'}

답변 형식:
1. 현재 판세 한 문장
2. 지금 픽 또는 밴에서 가장 중요한 추천 한 문장
3. 왜 그런지 한두 문장
4. 마지막에 '한 줄 액션:'으로 시작하는 문장 하나
"""
        try:
            message = await self._ollama_client.generate_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt.strip(),
            )
            return message or self._fallback(analysis)
        except Exception:
            return self._fallback(analysis)

    def _fallback(self, analysis: DraftAnalysisResponse) -> str:
        primary_pick = analysis.top_picks[0] if analysis.top_picks else None
        primary_ban = analysis.top_bans[0] if analysis.top_bans else None

        if analysis.action_type == DraftActionType.PICK and primary_pick is not None:
            return (
                f"현재 판세는 블루 {analysis.blue_estimated_win_rate}% 대 레드 {analysis.red_estimated_win_rate}%입니다. "
                f"지금은 {primary_pick.champion_name} {primary_pick.role.value} 추천이 가장 안정적입니다. "
                f"핵심 이유는 {', '.join(primary_pick.reasons[:2])}입니다. "
                f"한 줄 액션: {primary_pick.champion_name}를 우선 검토하고 상대 핵심 카운터는 {primary_ban.champion_name if primary_ban else '상위 위협 챔피언'}에서 찾으세요."
            )

        if primary_ban is not None:
            return (
                f"현재 판세는 블루 {analysis.blue_estimated_win_rate}% 대 레드 {analysis.red_estimated_win_rate}%입니다. "
                f"지금은 {primary_ban.champion_name} 밴이 가장 높은 차단 가치가 있습니다. "
                f"이유는 {', '.join(primary_ban.reasons[:2])}이 상대 조합 완성도를 크게 올리기 때문입니다. "
                f"한 줄 액션: {primary_ban.champion_name}를 우선 밴하고 다음 픽 후보를 바로 고르세요."
            )

        return "현재 드래프트 설명을 생성할 수 없습니다."
