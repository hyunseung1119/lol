import type { DraftTurn } from "../types";

type TurnTimelineProps = {
  turns: DraftTurn[];
  filledTurnCount: number;
};

export function TurnTimeline({ turns, filledTurnCount }: TurnTimelineProps) {
  return (
    <section className="timeline-strip">
      <div className="timeline-header">
        <div>
          <p className="eyebrow">Tournament Draft</p>
          <h2>프로/스크림형 밴픽 순서</h2>
        </div>
        <p className="topbar-copy">
          현재 MVP는 토너먼트 드래프트 순서를 기준으로 추천하며, 추후 Bo3/Bo5
          시리즈와 Fearless 확장을 염두에 둡니다.
        </p>
      </div>

      <ol
        className="timeline-track"
        aria-label={`토너먼트 드래프트 ${turns.length}턴, 현재 ${Math.min(filledTurnCount + 1, turns.length)}번째 턴`}
      >
        {turns.map((turn, index) => {
          const isDone = index < filledTurnCount;
          const isCurrent = index === filledTurnCount;
          const stateClass = isDone
            ? "is-done"
            : isCurrent
              ? turn.side === "blue"
                ? "is-current-blue"
                : "is-current-red"
              : "";
          const stateLabel = isDone
            ? "완료"
            : isCurrent
              ? "현재 턴"
              : "대기";
          const sideLabel = turn.side === "blue" ? "블루" : "레드";
          const actionLabel = turn.action === "ban" ? "밴" : "픽";

          return (
            <li
              key={`${turn.label}-${index}`}
              className={`timeline-node ${stateClass}`}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${turn.label}, ${sideLabel} ${actionLabel}, ${turn.phase}, ${stateLabel}`}
            >
              <strong>{turn.label}</strong>
              <span>{turn.phase}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
