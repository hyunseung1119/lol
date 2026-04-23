import type { ChampionSummary, DraftTurn, Role } from "../types";

type ChampionPanelProps = {
  champions: ChampionSummary[];
  currentTurn: DraftTurn | null;
  focusRole: Role;
  roleFilters: Role[];
  search: string;
  selectedTag: string;
  tagFilters: readonly string[];
  poolView: string;
  poolModes: readonly { id: string; label: string }[];
  preferredChampionIds: string[];
  recommendedChampionIds: Set<string>;
  ddragonVersion: string | null;
  onSearchChange: (value: string) => void;
  onFocusRoleChange: (value: Role) => void;
  onSelectedTagChange: (value: string) => void;
  onPoolViewChange: (value: string) => void;
  onCommitChampion: (champion: ChampionSummary) => void;
  onTogglePreferredChampion: (championId: string) => void;
};

export function ChampionPanel({
  champions,
  currentTurn,
  focusRole,
  roleFilters,
  search,
  selectedTag,
  tagFilters,
  poolView,
  poolModes,
  preferredChampionIds,
  recommendedChampionIds,
  ddragonVersion,
  onSearchChange,
  onFocusRoleChange,
  onSelectedTagChange,
  onPoolViewChange,
  onCommitChampion,
  onTogglePreferredChampion,
}: ChampionPanelProps) {
  return (
    <section className="champion-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Champion Pool</p>
          <h2>선택 가능한 챔피언</h2>
        </div>
        <div className="board-current-turn">
          <span>패널 모드</span>
          <strong>
            {currentTurn?.action === "ban" ? "밴 후보 탐색" : "픽 후보 탐색"}
          </strong>
          <div className="board-slot-subcopy">
            {focusRole === "FLEX" ? "자유 포지션" : `${focusRole} 필터 적용`}
          </div>
        </div>
      </div>

      <div className="champion-panel-toolbar">
        <label className="search-field">
          <span>챔피언 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="한국어 이름, 영문 ID, 태그 검색"
            aria-label="챔피언 검색"
          />
        </label>

        <div className="search-field">
          <span id="role-filter-label">포지션 초점</span>
          <div
            className="role-filter-row"
            role="radiogroup"
            aria-labelledby="role-filter-label"
          >
            {roleFilters.map((role) => (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={focusRole === role}
                className={`role-chip ${focusRole === role ? "is-active" : ""}`}
                onClick={() => onFocusRoleChange(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="champion-panel-filters">
        <div className="filter-group">
          <span id="tag-filter-label">태그 필터</span>
          <div
            className="role-filter-row"
            role="radiogroup"
            aria-labelledby="tag-filter-label"
          >
            {tagFilters.map((tag) => (
              <button
                key={tag}
                type="button"
                role="radio"
                aria-checked={selectedTag === tag}
                className={`role-chip ${selectedTag === tag ? "is-active" : ""}`}
                onClick={() => onSelectedTagChange(tag)}
              >
                {tag === "ALL" ? "전체 태그" : tag}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span id="pool-filter-label">보기 방식</span>
          <div
            className="role-filter-row"
            role="radiogroup"
            aria-labelledby="pool-filter-label"
          >
            {poolModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={poolView === mode.id}
                className={`role-chip ${poolView === mode.id ? "is-active" : ""}`}
                onClick={() => onPoolViewChange(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="champion-grid"
        role="list"
        aria-label={`선택 가능한 챔피언 ${champions.length}명`}
      >
        {champions.map((champion) => {
          const isPreferred = preferredChampionIds.includes(champion.id);
          const isRecommended = recommendedChampionIds.has(champion.id.toLowerCase());

          return (
            <article
              key={champion.id}
              role="listitem"
              aria-label={`${champion.name} ${champion.title}${isRecommended ? ", 추천 후보" : ""}${isPreferred ? ", 선호 챔피언" : ""}`}
              className={`champion-card ${isPreferred ? "is-preferred" : ""} ${isRecommended ? "is-recommended" : ""}`}
            >
              <div className="champion-splash">
                {ddragonVersion ? (
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champion.image}`}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                  />
                ) : null}
                <div className="champion-splash-overlay">
                  <span>{champion.title}</span>
                  {isRecommended ? <strong>추천 후보</strong> : null}
                </div>
              </div>

              <div className="champion-card-header">
                <div>
                  <h3>{champion.name}</h3>
                  <p className="champion-meta">{champion.id}</p>
                </div>
                <button
                  type="button"
                  className={`favorite-button ${isPreferred ? "is-active" : ""}`}
                  onClick={() => onTogglePreferredChampion(champion.id)}
                  aria-label={`${champion.name} 선호 챔피언 ${isPreferred ? "해제" : "추가"}`}
                  aria-pressed={isPreferred}
                >
                  <span aria-hidden="true">★</span>
                </button>
              </div>

              <div className="champion-tags">
                {champion.tags.map((tag) => (
                  <span key={tag} className="champion-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="champion-meta-grid">
                <div>
                  <span className="champion-meta">사거리</span>
                  <strong>{champion.stats.attackrange}</strong>
                </div>
                <div>
                  <span className="champion-meta">난이도</span>
                  <strong>{champion.info.difficulty}</strong>
                </div>
                <div>
                  <span className="champion-meta">공격</span>
                  <strong>{champion.info.attack}</strong>
                </div>
                <div>
                  <span className="champion-meta">마법</span>
                  <strong>{champion.info.magic}</strong>
                </div>
              </div>

              <div className="champion-action">
                <strong>
                  {currentTurn?.action === "ban"
                    ? "밴 카드로 사용"
                    : "현재 턴에 배치"}
                </strong>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!currentTurn}
                  onClick={() => onCommitChampion(champion)}
                >
                  {currentTurn?.action === "ban" ? "밴" : "선택"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
