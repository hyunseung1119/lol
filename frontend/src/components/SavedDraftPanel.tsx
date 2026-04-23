import type { StoredDraftRoom } from "../types";

type SavedDraftPanelProps = {
  configured: boolean;
  isAuthenticated: boolean;
  roomTitle: string;
  savedDrafts: StoredDraftRoom[];
  activeDraftRoomId: string | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  onRoomTitleChange: (value: string) => void;
  onSave: () => void;
  onRefresh: () => void;
  onLoadSavedDraft: (room: StoredDraftRoom) => void;
  onNewDraft: () => void;
};

export function SavedDraftPanel({
  configured,
  isAuthenticated,
  roomTitle,
  savedDrafts,
  activeDraftRoomId,
  loading,
  error,
  notice,
  onRoomTitleChange,
  onSave,
  onRefresh,
  onLoadSavedDraft,
  onNewDraft,
}: SavedDraftPanelProps) {
  return (
    <section className="saved-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Draft Rooms</p>
          <h2>저장한 드래프트</h2>
        </div>
      </div>

      <div className="stacked-form">
        <label className="panel-label">
          <span>현재 세션 이름</span>
          <input
            className="panel-input"
            value={roomTitle}
            onChange={(event) => onRoomTitleChange(event.target.value)}
            placeholder="예: 스크림 1세트 블루"
          />
        </label>

        <div className="saved-draft-toolbar">
          <button
            type="button"
            className="primary-button"
            disabled={!configured || !isAuthenticated || loading}
            onClick={onSave}
          >
            {loading ? "저장 중..." : "현재 조합 저장"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!configured || !isAuthenticated || loading}
            onClick={onRefresh}
          >
            목록 새로고침
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={onNewDraft}
          >
            새 세션
          </button>
        </div>
      </div>

      {!configured ? (
        <div className="panel-empty">
          <p>Supabase가 연결되면 여기서 드래프트 룸을 저장하고 불러올 수 있습니다.</p>
          <span>현재는 로컬 시뮬레이션 모드만 활성화되어 있습니다.</span>
        </div>
      ) : !isAuthenticated ? (
        <div className="panel-empty">
          <p>로그인 후 저장 기능을 사용할 수 있습니다.</p>
          <span>매직 링크 로그인만 붙여도 베타 유저 관리와 개인 저장이 가능합니다.</span>
        </div>
      ) : savedDrafts.length === 0 ? (
        <div className="panel-empty">
          <p>저장된 드래프트가 없습니다.</p>
          <span>현재 조합을 저장하면 여기에서 다시 불러올 수 있습니다.</span>
        </div>
      ) : (
        <ul
          className="saved-draft-list"
          aria-label={`저장된 드래프트 ${savedDrafts.length}개`}
        >
          {savedDrafts.map((room) => {
            const isActive = activeDraftRoomId === room.id;
            return (
              <li key={room.id}>
                <button
                  type="button"
                  className={`saved-draft-item ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${room.title}, ${room.patch} 패치, ${room.blue_picks.length + room.red_picks.length}픽${isActive ? ", 현재 불러와짐" : ""}`}
                  onClick={() => onLoadSavedDraft(room)}
                >
                  <div className="saved-draft-head">
                    <strong>{room.title}</strong>
                    <span>{formatDraftTime(room.updated_at)}</span>
                  </div>
                  <div className="saved-draft-meta">
                    <span>{room.patch} 패치</span>
                    <span>{room.persona_mode}</span>
                    <span>{room.blue_picks.length + room.red_picks.length}픽</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <div role="alert" className="status-message is-error">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="status-message is-success"
        >
          {notice}
        </div>
      ) : null}
    </section>
  );
}

function formatDraftTime(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
