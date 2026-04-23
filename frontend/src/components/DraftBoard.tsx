import type { ChampionSummary, DraftState, DraftTurn, Role } from "../types";

type DraftBoardProps = {
  draft: DraftState;
  currentTurn: DraftTurn | null;
  focusRole: Role;
  championIndex: Map<string, ChampionSummary>;
  ddragonVersion: string | null;
  onUndo: () => void;
  onReset: () => void;
  onLoadSample: () => void;
};

export function DraftBoard({
  draft,
  currentTurn,
  focusRole,
  championIndex,
  ddragonVersion,
  onUndo,
  onReset,
  onLoadSample,
}: DraftBoardProps) {
  return (
    <section className="board-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Draft Board</p>
          <h2>5:5 밴픽 보드</h2>
        </div>

        <div
          className={`board-current-turn ${currentTurn?.side === "red" ? "is-red" : "is-blue"}`}
        >
          <span>{currentTurn ? "지금 행동" : "상태"}</span>
          <strong>
            {currentTurn
              ? `${currentTurn.label} · ${currentTurn.action === "pick" ? "픽" : "밴"}`
              : "모든 턴 완료"}
          </strong>
          <div className="board-slot-subcopy">
            {currentTurn?.action === "pick"
              ? `현재 추천 포지션 ${focusRole}`
              : "상대 핵심 카드를 끊는 밴 단계"}
          </div>
        </div>
      </div>

      <div className="board-grid">
        <TeamCard
          title="Blue Side"
          teamClass="is-blue"
          bans={draft.blue_bans}
          picks={draft.blue_picks}
          activeAction={currentTurn?.side === "blue" ? currentTurn.action : null}
          championIndex={championIndex}
          ddragonVersion={ddragonVersion}
        />
        <TeamCard
          title="Red Side"
          teamClass="is-red"
          bans={draft.red_bans}
          picks={draft.red_picks}
          activeAction={currentTurn?.side === "red" ? currentTurn.action : null}
          championIndex={championIndex}
          ddragonVersion={ddragonVersion}
        />
      </div>

      <div className="board-toolbar">
        <button type="button" className="secondary-button" onClick={onUndo}>
          마지막 행동 취소
        </button>
        <button type="button" className="ghost-button" onClick={onLoadSample}>
          예시 드래프트 불러오기
        </button>
        <button type="button" className="ghost-button" onClick={onReset}>
          전체 초기화
        </button>
      </div>
    </section>
  );
}

type TeamCardProps = {
  title: string;
  teamClass: "is-blue" | "is-red";
  bans: string[];
  picks: DraftState["blue_picks"];
  activeAction: "pick" | "ban" | null;
  championIndex: Map<string, ChampionSummary>;
  ddragonVersion: string | null;
};

function TeamCard({
  title,
  teamClass,
  bans,
  picks,
  activeAction,
  championIndex,
  ddragonVersion,
}: TeamCardProps) {
  return (
    <article className={`team-card ${teamClass}`}>
      <div className="team-card-header">
        <h3>{title}</h3>
        <span className={`team-pill ${teamClass}`}>
          {teamClass === "is-blue" ? "선픽/블루" : "카운터/레드"}
        </span>
      </div>

      <div className="slot-group">
        <div className="slot-group-title">
          <strong>밴</strong>
          <span className="board-slot-subcopy">5개 슬롯</span>
        </div>
        <div className="slot-grid">
          {Array.from({ length: 5 }).map((_, index) => {
            const championId = bans[index];
            const champion = championId
              ? championIndex.get(championId.toLowerCase()) ?? null
              : null;

            return (
              <div
                key={`ban-${title}-${index}`}
                className={`board-slot ${champion ? "is-filled is-ban" : ""} ${
                  activeAction === "ban" && index === bans.length
                    ? teamClass === "is-blue"
                      ? "is-active-blue"
                      : "is-active-red"
                    : ""
                }`}
              >
                <span className="board-slot-subcopy">밴 {index + 1}</span>
                {champion ? (
                  <>
                    <SlotPortrait
                      champion={champion}
                      ddragonVersion={ddragonVersion}
                      tone="is-ban"
                    />
                    <strong>{champion.name}</strong>
                  </>
                ) : (
                  <strong>비어 있음</strong>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="slot-group">
        <div className="slot-group-title">
          <strong>픽</strong>
          <span className="board-slot-subcopy">5개 슬롯</span>
        </div>
        <div className="slot-grid">
          {Array.from({ length: 5 }).map((_, index) => {
            const pick = picks[index];
            const champion = pick
              ? championIndex.get(pick.champion_id.toLowerCase()) ?? null
              : null;

            return (
              <div
                key={`pick-${title}-${index}`}
                className={`board-slot ${pick ? "is-filled" : ""} ${
                  activeAction === "pick" && index === picks.length
                    ? teamClass === "is-blue"
                      ? "is-active-blue"
                      : "is-active-red"
                    : ""
                }`}
              >
                <span className="board-slot-subcopy">픽 {index + 1}</span>
                {champion ? (
                  <>
                    <SlotPortrait
                      champion={champion}
                      ddragonVersion={ddragonVersion}
                      tone="is-pick"
                    />
                    <strong>{champion.name}</strong>
                  </>
                ) : (
                  <strong>비어 있음</strong>
                )}
                {pick?.role ? <span className="slot-role">{pick.role}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function SlotPortrait({
  champion,
  ddragonVersion,
  tone,
}: {
  champion: ChampionSummary;
  ddragonVersion: string | null;
  tone: "is-ban" | "is-pick";
}) {
  if (!ddragonVersion) {
    return null;
  }

  return (
    <img
      className={`slot-image ${tone}`}
      src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champion.image}`}
      alt={champion.name}
      loading="lazy"
    />
  );
}
