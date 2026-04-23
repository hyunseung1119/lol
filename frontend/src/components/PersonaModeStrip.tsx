import type { PersonaMode } from "../types";

type PersonaPreset = {
  label: string;
  audience: string;
  pain: string;
  value: string;
  hint: string;
};

type PersonaModeStripProps = {
  personaMode: PersonaMode;
  presets: Record<PersonaMode, PersonaPreset>;
  onChange: (value: PersonaMode) => void;
};

const ORDER: PersonaMode[] = [
  "general",
  "pro",
  "veteran",
  "new",
  "coach",
  "director",
];

export function PersonaModeStrip({
  personaMode,
  presets,
  onChange,
}: PersonaModeStripProps) {
  const current = presets[personaMode];

  return (
    <section className="persona-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Audience Fit</p>
          <h2>페르소나 모드</h2>
        </div>
      </div>

      <div
        className="persona-chip-grid"
        role="radiogroup"
        aria-label="페르소나 모드 선택"
      >
        {ORDER.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={personaMode === mode}
            className={`persona-chip ${personaMode === mode ? "is-active" : ""}`}
            onClick={() => onChange(mode)}
          >
            {presets[mode].label}
          </button>
        ))}
      </div>

      <article className="persona-detail-card">
        <div className="persona-detail-row">
          <span>대상</span>
          <strong>{current.audience}</strong>
        </div>
        <div className="persona-detail-row">
          <span>대표 고충</span>
          <strong>{current.pain}</strong>
        </div>
        <div className="persona-detail-row">
          <span>제품 가치</span>
          <strong>{current.value}</strong>
        </div>
        <div className="persona-detail-row">
          <span>추천 해석 힌트</span>
          <strong>{current.hint}</strong>
        </div>
      </article>
    </section>
  );
}
