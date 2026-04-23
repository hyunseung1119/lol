import type { DraftTurn, MetaResponse } from "../types";

type MetaStripProps = {
  meta: MetaResponse | null;
  currentTurn: DraftTurn | null;
  preferredChampionCount: number;
  bootLoading: boolean;
  personaLabel: string;
};

export function MetaStrip({
  meta,
  currentTurn,
  preferredChampionCount,
  bootLoading,
  personaLabel,
}: MetaStripProps) {
  return (
    <section className="meta-strip">
      <article className="meta-card">
        <span>현재 턴</span>
        <strong>{currentTurn?.label ?? "드래프트 종료"}</strong>
      </article>
      <article className="meta-card">
        <span>진행 페이즈</span>
        <strong>{currentTurn?.phase ?? "완료"}</strong>
      </article>
      <article className="meta-card">
        <span>공식 챔피언 데이터</span>
        <strong>
          {bootLoading
            ? "불러오는 중"
            : `${meta?.champion_count ?? 0}개 / ${meta?.ddragon_version ?? "-"}`}
        </strong>
      </article>
      <article className="meta-card">
        <span>활성 페르소나</span>
        <strong>{personaLabel}</strong>
      </article>
      <article className="meta-card">
        <span>선호 챔피언 풀</span>
        <strong>{preferredChampionCount}개 선택</strong>
      </article>
      <article className="meta-card">
        <span>Riot API 상태</span>
        <strong>{meta?.riot_api_configured ? "연결됨" : "로컬 모드"}</strong>
      </article>
    </section>
  );
}
