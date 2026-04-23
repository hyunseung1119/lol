import type { DraftAnalysisResponse, DraftTurn } from "../types";

type InsightPanelProps = {
  analysis: DraftAnalysisResponse | null;
  analyzing: boolean;
  analysisError: string | null;
  currentTurn: DraftTurn | null;
  personaLabel: string;
};

export function InsightPanel({
  analysis,
  analyzing,
  analysisError,
  currentTurn,
  personaLabel,
}: InsightPanelProps) {
  if (analysisError) {
    return (
      <section className="insight-panel">
        <div className="empty-card">
          <p className="eyebrow">Analysis Error</p>
          <h2>추천 분석을 불러오지 못했습니다</h2>
          <p>{analysisError}</p>
        </div>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="insight-panel">
        <div className="empty-card">
          <p className="eyebrow">Analysis</p>
          <h2>드래프트 분석 준비 중</h2>
          <p>챔피언 데이터와 현재 턴 정보를 바탕으로 추천을 계산하고 있습니다.</p>
        </div>
      </section>
    );
  }

  const recommendationList =
    currentTurn?.action === "ban" ? analysis.top_bans : analysis.top_picks;

  return (
    <section className="insight-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Model Output</p>
          <h2>추천과 설명</h2>
        </div>
        <div className="board-current-turn">
          <span>분석 상태</span>
          <strong>{analyzing ? "갱신 중" : "최신 추천 반영"}</strong>
          <div className="board-slot-subcopy">
            신뢰도 {analysis.confidence}% · {analysis.patch} 패치
          </div>
        </div>
      </div>

      <div className="insight-grid">
        <article className="metric-card">
          <span>블루 예상 승률</span>
          <strong>{analysis.blue_estimated_win_rate}%</strong>
        </article>
        <article className="metric-card">
          <span>레드 예상 승률</span>
          <strong>{analysis.red_estimated_win_rate}%</strong>
        </article>
        <article className="metric-card">
          <span>현재 대상</span>
          <strong>{personaLabel}</strong>
        </article>
        <article className="metric-card">
          <span>추천 신뢰도</span>
          <strong>{analysis.confidence}%</strong>
        </article>
      </div>

      <div className="insight-stack">
        <section className="insight-block">
          <div className="insight-block-header">
            <h3>LLM 요약</h3>
            <span className="win-pill">
              {analysis.suggested_role} · {personaLabel}
            </span>
          </div>
          <article className="warning-card">
            <p>{analysis.explanation}</p>
          </article>
        </section>

        <section className="insight-block">
          <div className="insight-block-header">
            <h3>
              {currentTurn?.action === "ban" ? "밴 추천 Top 5" : "픽 추천 Top 5"}
            </h3>
            <span className="win-pill">
              {currentTurn?.side === "red" ? "Red Turn" : "Blue Turn"}
            </span>
          </div>

          <div className="recommendation-list">
            {recommendationList.length === 0 ? (
              <article className="warning-card">
                <p>현재 조건에서는 노출할 추천 후보가 없습니다.</p>
              </article>
            ) : (
              recommendationList.map((item) => (
                <article key={item.champion_id} className="recommendation-item">
                  <div className="recommendation-head">
                    <div>
                      <span>{item.role}</span>
                      <strong>{item.champion_name}</strong>
                    </div>
                    <div className="win-pill">
                      예상 {item.estimated_win_rate}% / 점수 {item.recommendation_score}
                    </div>
                  </div>

                  <ul className="reason-list">
                    {item.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>

                  <div className="breakdown-grid">
                    <BreakdownItem label="역할" value={item.breakdown.role_fit} />
                    <BreakdownItem label="시너지" value={item.breakdown.synergy} />
                    <BreakdownItem label="카운터" value={item.breakdown.counter} />
                    <BreakdownItem label="패치" value={item.breakdown.patch} />
                    <BreakdownItem label="숙련" value={item.breakdown.comfort} />
                    <BreakdownItem label="페르소나" value={item.breakdown.persona} />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="insight-block">
          <div className="insight-block-header">
            <h3>팀 프로필</h3>
          </div>
          <div className="profile-grid">
            <ProfileCard label="Blue" profile={analysis.blue_profile} />
            <ProfileCard label="Red" profile={analysis.red_profile} />
          </div>
        </section>

        <section className="insight-block">
          <div className="insight-block-header">
            <h3>주의 사항</h3>
          </div>
          <article className="warning-card">
            <ul className="warning-list">
              {(analysis.warnings.length > 0
                ? analysis.warnings
                : ["경고 메시지가 없습니다."]).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            {/* TODO(human): 실측 데이터 파이프라인이 붙으면 이 경고를 confidence badge와 함께 더 구체적으로 바꿔보세요. */}
          </article>
        </section>
      </div>
    </section>
  );
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="breakdown-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileCard({
  label,
  profile,
}: {
  label: string;
  profile: DraftAnalysisResponse["blue_profile"];
}) {
  return (
    <article className="profile-card">
      <h3>{label}</h3>
      <ul className="profile-list">
        <li>
          <span>전면전</span>
          <strong>{profile.frontline}</strong>
        </li>
        <li>
          <span>이니시</span>
          <strong>{profile.engage}</strong>
        </li>
        <li>
          <span>포킹</span>
          <strong>{profile.poke}</strong>
        </li>
        <li>
          <span>받아치기</span>
          <strong>{profile.peel}</strong>
        </li>
        <li>
          <span>AD 비중</span>
          <strong>{profile.physical_damage}</strong>
        </li>
        <li>
          <span>AP 비중</span>
          <strong>{profile.magic_damage}</strong>
        </li>
      </ul>
    </article>
  );
}
