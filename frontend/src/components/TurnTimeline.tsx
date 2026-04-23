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

      <div className="timeline-track">
        {turns.map((turn, index) => {
          const stateClass =
            index < filledTurnCount
              ? "is-done"
              : index === filledTurnCount
                ? turn.side === "blue"
                  ? "is-current-blue"
                  : "is-current-red"
                : "";

          return (
            <article key={`${turn.label}-${index}`} className={`timeline-node ${stateClass}`}>
              <strong>{turn.label}</strong>
              <span>{turn.phase}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
