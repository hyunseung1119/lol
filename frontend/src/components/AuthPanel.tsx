type AuthPanelProps = {
  configured: boolean;
  authLoading: boolean;
  authBusy: boolean;
  authEmail: string;
  sessionEmail: string | null;
  authError: string | null;
  authNotice: string | null;
  onAuthEmailChange: (value: string) => void;
  onRequestMagicLink: () => void;
  onSignOut: () => void;
};

export function AuthPanel({
  configured,
  authLoading,
  authBusy,
  authEmail,
  sessionEmail,
  authError,
  authNotice,
  onAuthEmailChange,
  onRequestMagicLink,
  onSignOut,
}: AuthPanelProps) {
  return (
    <section className="auth-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Beta Access</p>
          <h2>로그인</h2>
        </div>
      </div>

      {!configured ? (
        <div className="panel-empty">
          <p>Supabase 연결 전입니다.</p>
          <span>환경 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣으면 바로 활성화됩니다.</span>
        </div>
      ) : authLoading ? (
        <div className="panel-empty">
          <p>세션 확인 중</p>
          <span>Supabase 인증 상태를 읽고 있습니다.</span>
        </div>
      ) : sessionEmail ? (
        <div className="stacked-form">
          <div className="auth-session-card">
            <span>로그인 계정</span>
            <strong>{sessionEmail}</strong>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={authBusy}
            onClick={onSignOut}
          >
            로그아웃
          </button>
        </div>
      ) : (
        <div className="stacked-form">
          <label className="panel-label">
            <span>이메일 매직 링크</span>
            <input
              className="panel-input"
              value={authEmail}
              onChange={(event) => onAuthEmailChange(event.target.value)}
              placeholder="beta@team.gg"
              type="email"
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={authBusy || authEmail.trim().length === 0}
            onClick={onRequestMagicLink}
          >
            {authBusy ? "전송 중..." : "매직 링크 보내기"}
          </button>
        </div>
      )}

      {authError ? (
        <div role="alert" className="status-message is-error">
          {authError}
        </div>
      ) : null}
      {authNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="status-message is-success"
        >
          {authNotice}
        </div>
      ) : null}
    </section>
  );
}
