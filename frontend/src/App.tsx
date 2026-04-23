import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { ChampionPanel } from "./components/ChampionPanel";
import { DraftBoard } from "./components/DraftBoard";
import { InsightPanel } from "./components/InsightPanel";
import { MetaStrip } from "./components/MetaStrip";
import { PersonaModeStrip } from "./components/PersonaModeStrip";
import { SavedDraftPanel } from "./components/SavedDraftPanel";
import { TurnTimeline } from "./components/TurnTimeline";
import {
  DRAFT_ROOM_SELECT,
  type DraftRoomRow,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  mapDraftRoomRow,
} from "./lib/supabase";
import {
  buildShareUrl,
  clearShareTokenFromUrl,
  decodeShareState,
  readShareTokenFromUrl,
} from "./lib/shareUrl";
import type {
  ChampionSummary,
  DraftAnalysisResponse,
  DraftState,
  DraftTurn,
  MetaResponse,
  PersonaMode,
  Role,
  StoredDraftRoom,
} from "./types";

const DEFAULT_PROD_API_BASE = "https://lol-draft-lab-api.vercel.app/api";
const PROD_API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_PROD_API_BASE;
const DEV_API_BASE = "http://127.0.0.1:8000/api";
const API_BASE = import.meta.env.DEV ? DEV_API_BASE : PROD_API_BASE;

const TOURNAMENT_SEQUENCE: DraftTurn[] = [
  { side: "blue", action: "ban", label: "B 밴 1", phase: "1차 밴", sequenceIndex: 0 },
  { side: "red", action: "ban", label: "R 밴 1", phase: "1차 밴", sequenceIndex: 1 },
  { side: "blue", action: "ban", label: "B 밴 2", phase: "1차 밴", sequenceIndex: 2 },
  { side: "red", action: "ban", label: "R 밴 2", phase: "1차 밴", sequenceIndex: 3 },
  { side: "blue", action: "ban", label: "B 밴 3", phase: "1차 밴", sequenceIndex: 4 },
  { side: "red", action: "ban", label: "R 밴 3", phase: "1차 밴", sequenceIndex: 5 },
  { side: "blue", action: "pick", label: "B 픽 1", phase: "1차 픽", sequenceIndex: 6 },
  { side: "red", action: "pick", label: "R 픽 1", phase: "1차 픽", sequenceIndex: 7 },
  { side: "red", action: "pick", label: "R 픽 2", phase: "1차 픽", sequenceIndex: 8 },
  { side: "blue", action: "pick", label: "B 픽 2", phase: "1차 픽", sequenceIndex: 9 },
  { side: "blue", action: "pick", label: "B 픽 3", phase: "1차 픽", sequenceIndex: 10 },
  { side: "red", action: "pick", label: "R 픽 3", phase: "1차 픽", sequenceIndex: 11 },
  { side: "red", action: "ban", label: "R 밴 4", phase: "2차 밴", sequenceIndex: 12 },
  { side: "blue", action: "ban", label: "B 밴 4", phase: "2차 밴", sequenceIndex: 13 },
  { side: "red", action: "ban", label: "R 밴 5", phase: "2차 밴", sequenceIndex: 14 },
  { side: "blue", action: "ban", label: "B 밴 5", phase: "2차 밴", sequenceIndex: 15 },
  { side: "red", action: "pick", label: "R 픽 4", phase: "2차 픽", sequenceIndex: 16 },
  { side: "blue", action: "pick", label: "B 픽 4", phase: "2차 픽", sequenceIndex: 17 },
  { side: "blue", action: "pick", label: "B 픽 5", phase: "2차 픽", sequenceIndex: 18 },
  { side: "red", action: "pick", label: "R 픽 5", phase: "2차 픽", sequenceIndex: 19 },
];

const ROLE_FILTERS: Role[] = [
  "TOP",
  "JUNGLE",
  "MID",
  "BOTTOM",
  "SUPPORT",
  "FLEX",
];

const TAG_FILTERS = [
  "ALL",
  "Assassin",
  "Fighter",
  "Mage",
  "Marksman",
  "Support",
  "Tank",
] as const;

const POOL_MODES = [
  { id: "all", label: "전체" },
  { id: "recommended", label: "추천만" },
  { id: "preferred", label: "선호만" },
] as const;

const EMPTY_DRAFT: DraftState = {
  blue_bans: [],
  red_bans: [],
  blue_picks: [],
  red_picks: [],
};

const SAMPLE_DRAFT: DraftState = {
  blue_bans: ["Mel", "DrMundo", "Nami"],
  red_bans: ["Karma", "Lucian", "Hwei"],
  blue_picks: [
    { champion_id: "Sejuani", role: "JUNGLE" },
    { champion_id: "Orianna", role: "MID" },
  ],
  red_picks: [
    { champion_id: "Vi", role: "JUNGLE" },
    { champion_id: "Ahri", role: "MID" },
    { champion_id: "Rell", role: "SUPPORT" },
  ],
};

const PERSONA_PRESETS: Record<
  PersonaMode,
  {
    label: string;
    audience: string;
    pain: string;
    value: string;
    hint: string;
  }
> = {
  general: {
    label: "일반 유저",
    audience: "솔랭과 자유랭에서 무난한 승률과 조합 완성도를 챙기고 싶은 플레이어",
    pain: "손에 익은 픽만 반복하다가 팀 전체 딜 분배와 이니시 구조가 무너지는 일이 많습니다.",
    value: "이 도구는 개별 손맛 픽 대신, 팀 승리 조건이 살아나는 안정적인 선택지를 빠르게 좁혀줍니다.",
    hint: "즉흥적인 픽보다 팀 전체 조합의 빈칸을 먼저 보세요.",
  },
  pro: {
    label: "프로게이머",
    audience: "스크림과 대회에서 턴 가치가 분명한 카드가 필요한 선수",
    pain: "한 장의 선택이 라인전보다 오브젝트, 시야, 이니시 우선권을 더 크게 흔들 수 있습니다.",
    value: "턴 가치, 이니시, 스케일링, 카운터 구도를 함께 설명해 실전 의사결정 속도를 높입니다.",
    hint: "라인전 체감보다 시리즈 전체의 드래프트 논리를 우선합니다.",
  },
  veteran: {
    label: "복귀 유저",
    audience: "예전 챔피언 이해는 있지만 현재 메타 업데이트가 끊긴 플레이어",
    pain: "익숙한 챔피언은 남아 있는데 현재 시즌에서 어떤 조합이 통하는지 감이 약해집니다.",
    value: "익숙한 챔프풀을 버리지 않으면서도 패치 손실이 큰 선택을 피하도록 도와줍니다.",
    hint: "추억의 주력 챔피언을 중심으로, 메타 손실이 적은 카드부터 다시 잡습니다.",
  },
  new: {
    label: "신규 유저",
    audience: "챔피언 이해와 포지션 이해를 동시에 익혀야 하는 입문자",
    pain: "고난도 추천이나 추상적인 설명은 실제 게임에서 바로 따라 하기 어렵습니다.",
    value: "난도와 역할 선명도를 함께 고려해, 지금 배워도 바로 체감 가능한 안정 픽을 우선 추천합니다.",
    hint: "캐리 욕심보다 역할이 선명한 안정 픽부터 익히는 것이 빠릅니다.",
  },
  coach: {
    label: "코치",
    audience: "선수 챔프폭과 팀 조합 규칙을 동시에 봐야 하는 코칭 스태프",
    pain: "선수 선호와 팀 규칙이 충돌할 때, 설명 가능한 근거가 없으면 리뷰와 피드백이 약해집니다.",
    value: "조합의 빈칸, 선수 숙련, 현재 메타를 함께 보여줘서 리뷰 자료와 피드백 근거로 바로 쓸 수 있습니다.",
    hint: "선수 실행 난도와 팀 규칙을 함께 반영하는 운영용 시점입니다.",
  },
  director: {
    label: "감독",
    audience: "시리즈 전체 전략과 운영 원칙을 설계하는 감독·매니저",
    pain: "한 세트의 날카로움보다 재현 가능한 전략 틀을 잡는 일이 더 중요한데 현장 정보는 쉽게 흩어집니다.",
    value: "전면전, 스케일링, 리스크를 구조적으로 보여줘서 시리즈 운영 원칙과 기용 판단을 정리하기 쉽습니다.",
    hint: "한 판의 극단적 하이리스크보다 시리즈 전체의 재현성과 안정성을 봅니다.",
  },
};

type ChampionTagFilter = (typeof TAG_FILTERS)[number];
type PoolViewMode = (typeof POOL_MODES)[number]["id"];

function App() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [champions, setChampions] = useState<ChampionSummary[]>([]);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [analysis, setAnalysis] = useState<DraftAnalysisResponse | null>(null);
  const [focusRole, setFocusRole] = useState<Role>("FLEX");
  const [personaMode, setPersonaMode] = useState<PersonaMode>("general");
  const [preferredChampionIds, setPreferredChampionIds] = useState<string[]>([]);
  const [draftTitle, setDraftTitle] = useState("새 드래프트");
  const [activeDraftRoomId, setActiveDraftRoomId] = useState<string | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<StoredDraftRoom[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<ChampionTagFilter>("ALL");
  const [poolView, setPoolView] = useState<PoolViewMode>("all");
  const [bootLoading, setBootLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [savedDraftLoading, setSavedDraftLoading] = useState(false);
  const [savedDraftError, setSavedDraftError] = useState<string | null>(null);
  const [savedDraftNotice, setSavedDraftNotice] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);
  const activePersona = PERSONA_PRESETS[personaMode];

  const filledTurnCount =
    draft.blue_bans.length +
    draft.red_bans.length +
    draft.blue_picks.length +
    draft.red_picks.length;

  const currentTurn = TOURNAMENT_SEQUENCE[filledTurnCount] ?? null;

  const championIndex = useMemo(() => {
    return new Map(
      champions.map((champion) => [champion.id.toLowerCase(), champion]),
    );
  }, [champions]);

  const occupiedChampionIds = useMemo(() => {
    return new Set(
      [
        ...draft.blue_bans,
        ...draft.red_bans,
        ...draft.blue_picks.map((pick) => pick.champion_id),
        ...draft.red_picks.map((pick) => pick.champion_id),
      ].map((championId) => championId.toLowerCase()),
    );
  }, [draft]);

  const recommendedChampionIds = useMemo(() => {
    const ids = new Set<string>();
    analysis?.top_picks.forEach((item) => ids.add(item.champion_id.toLowerCase()));
    analysis?.top_bans.forEach((item) => ids.add(item.champion_id.toLowerCase()));
    return ids;
  }, [analysis]);

  const filteredChampions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return champions
      .filter((champion) => {
        const championKey = champion.id.toLowerCase();
        const isPreferred = preferredChampionIds.includes(champion.id);
        const isRecommended = recommendedChampionIds.has(championKey);

        if (occupiedChampionIds.has(championKey)) {
          return false;
        }

        const matchesQuery =
          query.length === 0 ||
          champion.name.toLowerCase().includes(query) ||
          champion.id.toLowerCase().includes(query) ||
          champion.tags.some((tag) => tag.toLowerCase().includes(query));

        const matchesRole =
          focusRole === "FLEX" || estimateRoleMatch(champion, focusRole);

        const matchesTag =
          selectedTag === "ALL" || champion.tags.includes(selectedTag);

        const matchesPool =
          poolView === "all" ||
          (poolView === "recommended" && isRecommended) ||
          (poolView === "preferred" && isPreferred);

        return matchesQuery && matchesRole && matchesTag && matchesPool;
      })
      .sort((left, right) => {
        const leftPriority =
          Number(recommendedChampionIds.has(left.id.toLowerCase())) * 4 +
          Number(preferredChampionIds.includes(left.id)) * 2 +
          Number(estimateRoleMatch(left, focusRole));
        const rightPriority =
          Number(recommendedChampionIds.has(right.id.toLowerCase())) * 4 +
          Number(preferredChampionIds.includes(right.id)) * 2 +
          Number(estimateRoleMatch(right, focusRole));

        return (
          rightPriority - leftPriority ||
          left.name.localeCompare(right.name, "ko-KR")
        );
      });
  }, [
    champions,
    deferredSearch,
    focusRole,
    occupiedChampionIds,
    poolView,
    preferredChampionIds,
    recommendedChampionIds,
    selectedTag,
  ]);

  useEffect(() => {
    const token = readShareTokenFromUrl();
    if (!token) {
      return;
    }
    const decoded = decodeShareState(token);
    if (decoded) {
      setDraft(decoded.draft);
      setPersonaMode(decoded.personaMode);
      setSavedDraftNotice("공유 링크에서 드래프트를 불러왔습니다.");
    } else {
      setSavedDraftError("공유 링크를 해석할 수 없습니다. URL이 손상됐을 수 있어요.");
    }
    clearShareTokenFromUrl();
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setBootLoading(true);
      setBootError(null);

      try {
        const [metaResponse, championResponse] = await Promise.all([
          fetch(`${API_BASE}/meta`),
          fetch(`${API_BASE}/champions`),
        ]);

        if (!metaResponse.ok || !championResponse.ok) {
          throw new Error("초기 메타 정보를 불러오지 못했습니다.");
        }

        const metaPayload = (await metaResponse.json()) as MetaResponse;
        const championPayload = (await championResponse.json()) as ChampionSummary[];
        setMeta(metaPayload);
        setChampions(championPayload);
      } catch (error) {
        setBootError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setBootLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      setSavedDrafts([]);
      return;
    }

    void ensureProfile(session);
    void refreshSavedDrafts();
  }, [session, supabase]);

  useEffect(() => {
    if (!meta) {
      return;
    }

    const activeMeta = meta;
    const controller = new AbortController();

    async function analyzeDraft() {
      setAnalyzing(true);
      setAnalysisError(null);

      try {
        const response = await fetch(`${API_BASE}/draft/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "tournament",
            patch: activeMeta.patch,
            ...draft,
            side_to_act: currentTurn?.side ?? "blue",
            action_type: currentTurn?.action ?? "pick",
            suggested_role:
              currentTurn?.action === "pick" ? focusRole : "FLEX",
            persona_mode: personaMode,
            preferred_champions: preferredChampionIds,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`분석 요청 실패: status=${response.status}`);
        }

        const payload = (await response.json()) as DraftAnalysisResponse;
        setAnalysis(payload);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setAnalysisError(
          error instanceof Error
            ? error.message
            : "드래프트 분석에 실패했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setAnalyzing(false);
        }
      }
    }

    void analyzeDraft();

    return () => {
      controller.abort();
    };
  }, [draft, currentTurn, focusRole, meta, personaMode, preferredChampionIds]);

  function commitChampion(champion: ChampionSummary) {
    if (!currentTurn) {
      return;
    }

    startTransition(() => {
      setDraft((currentDraft) => {
        if (currentTurn.action === "ban") {
          if (currentTurn.side === "blue") {
            return {
              ...currentDraft,
              blue_bans: [...currentDraft.blue_bans, champion.id],
            };
          }

          return {
            ...currentDraft,
            red_bans: [...currentDraft.red_bans, champion.id],
          };
        }

        const nextPick = {
          champion_id: champion.id,
          role: focusRole === "FLEX" ? null : focusRole,
        };

        if (currentTurn.side === "blue") {
          return {
            ...currentDraft,
            blue_picks: [...currentDraft.blue_picks, nextPick],
          };
        }

        return {
          ...currentDraft,
          red_picks: [...currentDraft.red_picks, nextPick],
        };
      });
    });
  }

  function undoLastAction() {
    const previousTurn = TOURNAMENT_SEQUENCE[filledTurnCount - 1];
    if (!previousTurn) {
      return;
    }

    setDraft((currentDraft) => {
      if (previousTurn.action === "ban") {
        if (previousTurn.side === "blue") {
          return {
            ...currentDraft,
            blue_bans: currentDraft.blue_bans.slice(0, -1),
          };
        }

        return {
          ...currentDraft,
          red_bans: currentDraft.red_bans.slice(0, -1),
        };
      }

      if (previousTurn.side === "blue") {
        return {
          ...currentDraft,
          blue_picks: currentDraft.blue_picks.slice(0, -1),
        };
      }

      return {
        ...currentDraft,
        red_picks: currentDraft.red_picks.slice(0, -1),
      };
    });
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT);
    setFocusRole("FLEX");
    setPersonaMode("general");
    setPreferredChampionIds([]);
    setDraftTitle("새 드래프트");
    setActiveDraftRoomId(null);
    setSearch("");
    setSelectedTag("ALL");
    setPoolView("all");
    setSavedDraftNotice(null);
  }

  function loadSampleDraft() {
    setDraft(SAMPLE_DRAFT);
    setFocusRole("BOTTOM");
    setPersonaMode("coach");
    setPreferredChampionIds(["Caitlyn", "Rell"]);
    setDraftTitle("스크림 예시 밴픽");
    setActiveDraftRoomId(null);
    setSelectedTag("Marksman");
    setPoolView("recommended");
  }

  function togglePreferredChampion(championId: string) {
    setPreferredChampionIds((current) =>
      current.includes(championId)
        ? current.filter((id) => id !== championId)
        : [...current, championId],
    );
  }

  async function ensureProfile(currentSession: Session) {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: currentSession.user.id,
        display_name:
          currentSession.user.user_metadata.full_name ??
          currentSession.user.email?.split("@")[0] ??
          null,
        default_persona: personaMode,
      },
      { onConflict: "id" },
    );

    if (error) {
      setAuthError(error.message);
    }
  }

  async function refreshSavedDrafts() {
    if (!supabase || !session) {
      return;
    }

    setSavedDraftLoading(true);
    setSavedDraftError(null);

    const { data, error } = await supabase
      .from("draft_rooms")
      .select(DRAFT_ROOM_SELECT)
      .order("updated_at", { ascending: false })
      .limit(8);

    if (error) {
      setSavedDraftError(error.message);
      setSavedDraftLoading(false);
      return;
    }

    const rows = (data ?? []) as DraftRoomRow[];
    setSavedDrafts(rows.map(mapDraftRoomRow));
    setSavedDraftLoading(false);
  }

  async function requestMagicLink() {
    if (!supabase || authEmail.trim().length === 0) {
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthNotice("로그인 링크를 이메일로 보냈습니다.");
    }

    setAuthBusy(false);
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthNotice("로그아웃했습니다.");
      setSavedDrafts([]);
    }

    setAuthBusy(false);
  }

  async function saveCurrentDraft() {
    if (!supabase || !session) {
      setSavedDraftError("Supabase 로그인 후 저장할 수 있습니다.");
      return;
    }

    setSavedDraftLoading(true);
    setSavedDraftError(null);
    setSavedDraftNotice(null);

    const title = draftTitle.trim() || `${meta?.patch ?? "26.8"} 드래프트`;
    const payload = {
      title,
      created_by: session.user.id,
      queue_type: "tournament",
      patch: meta?.patch ?? "26.8",
      persona_mode: personaMode,
      side_to_act: currentTurn?.side ?? "blue",
      action_type: currentTurn?.action ?? "pick",
      status: currentTurn ? "drafting" : "locked",
      blue_bans: draft.blue_bans,
      red_bans: draft.red_bans,
      blue_picks: draft.blue_picks,
      red_picks: draft.red_picks,
      preferred_champions: preferredChampionIds,
      blue_estimated_win_rate: analysis?.blue_estimated_win_rate ?? null,
      red_estimated_win_rate: analysis?.red_estimated_win_rate ?? null,
      confidence: analysis?.confidence ?? null,
      explanation: analysis?.explanation ?? null,
      is_public_share: false,
    };

    const query = activeDraftRoomId
      ? supabase
          .from("draft_rooms")
          .update(payload)
          .eq("id", activeDraftRoomId)
          .select(DRAFT_ROOM_SELECT)
          .single()
      : supabase
          .from("draft_rooms")
          .insert(payload)
          .select(DRAFT_ROOM_SELECT)
          .single();

    const { data, error } = await query;

    if (error) {
      setSavedDraftError(error.message);
      setSavedDraftLoading(false);
      return;
    }

    const mapped = mapDraftRoomRow(data as DraftRoomRow);
    setDraftTitle(mapped.title);
    setActiveDraftRoomId(mapped.id);
    setSavedDraftNotice("현재 드래프트를 저장했습니다.");
    await refreshSavedDrafts();
    setSavedDraftLoading(false);
  }

  async function shareCurrentDraft() {
    const url = buildShareUrl(draft, personaMode);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setSavedDraftNotice("공유 링크를 복사했습니다. 필요한 곳에 붙여 넣어주세요.");
        setSavedDraftError(null);
      } else {
        window.prompt("공유 링크를 복사하세요", url);
      }
    } catch (error) {
      setSavedDraftError(
        error instanceof Error
          ? `클립보드 복사에 실패했습니다: ${error.message}`
          : "클립보드 복사에 실패했습니다.",
      );
    }
  }

  function loadSavedDraft(room: StoredDraftRoom) {
    setDraft({
      blue_bans: room.blue_bans,
      red_bans: room.red_bans,
      blue_picks: room.blue_picks,
      red_picks: room.red_picks,
    });
    setPersonaMode(room.persona_mode);
    setPreferredChampionIds(room.preferred_champions);
    setDraftTitle(room.title);
    setActiveDraftRoomId(room.id);
    setSavedDraftNotice("저장한 드래프트를 불러왔습니다.");
    setSavedDraftError(null);
  }

  const bootReady = !bootLoading && !bootError;

  const liveTurnSummary = currentTurn
    ? `${currentTurn.side === "blue" ? "블루" : "레드"} ${currentTurn.action === "ban" ? "밴" : "픽"} 차례, ${currentTurn.label}, ${currentTurn.phase}`
    : "모든 밴픽 턴이 완료되었습니다.";

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveTurnSummary}
      </div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Draft Intelligence Workspace</p>
          <h1>LoL Draft Lab</h1>
          <p className="topbar-copy">
            5:5 밴픽 시뮬레이션, 현재 패치 기준 추천, 한국어 LLM 설명을 한
            화면에서 다루는 드래프트 워크스페이스입니다.
          </p>
        </div>

        <div className="topbar-badge-row">
          <div className="topbar-badge">
            <span>현재 시즌 기준</span>
            <strong>{meta?.patch ?? "26.8"} 패치</strong>
          </div>
          <div className="topbar-badge">
            <span>모델 설명</span>
            <strong>gemma4:e4b</strong>
          </div>
          <div className="topbar-badge">
            <span>활성 페르소나</span>
            <strong>{activePersona.label}</strong>
          </div>
        </div>
      </header>

      <MetaStrip
        meta={meta}
        currentTurn={currentTurn}
        preferredChampionCount={preferredChampionIds.length}
        bootLoading={bootLoading}
        personaLabel={activePersona.label}
      />

      <TurnTimeline
        turns={TOURNAMENT_SEQUENCE}
        filledTurnCount={filledTurnCount}
      />

      {!bootReady ? (
        <section className="state-panel">
          <h2>{bootLoading ? "초기 데이터 불러오는 중" : "초기화 실패"}</h2>
          <p>{bootError ?? "공식 챔피언 데이터와 메타 정보를 가져오는 중입니다."}</p>
        </section>
      ) : (
        <>
          <div className="workspace-grid" id="main-content">
            <div className="workspace-main">
              <DraftBoard
                draft={draft}
                currentTurn={currentTurn}
                focusRole={focusRole}
                championIndex={championIndex}
                ddragonVersion={meta?.ddragon_version ?? null}
                onUndo={undoLastAction}
                onReset={resetDraft}
                onLoadSample={loadSampleDraft}
                onShare={shareCurrentDraft}
              />

              <ChampionPanel
                champions={filteredChampions}
                currentTurn={currentTurn}
                focusRole={focusRole}
                roleFilters={ROLE_FILTERS}
                search={search}
                selectedTag={selectedTag}
                tagFilters={TAG_FILTERS}
                poolView={poolView}
                poolModes={POOL_MODES}
                preferredChampionIds={preferredChampionIds}
                recommendedChampionIds={recommendedChampionIds}
                ddragonVersion={meta?.ddragon_version ?? null}
                onSearchChange={setSearch}
                onFocusRoleChange={setFocusRole}
                onSelectedTagChange={(value) =>
                  setSelectedTag(value as ChampionTagFilter)
                }
                onPoolViewChange={(value) => setPoolView(value as PoolViewMode)}
                onCommitChampion={commitChampion}
                onTogglePreferredChampion={togglePreferredChampion}
              />
            </div>

            <aside className="workspace-side">
              <AuthPanel
                configured={isSupabaseConfigured}
                authLoading={authLoading}
                authBusy={authBusy}
                authEmail={authEmail}
                sessionEmail={session?.user.email ?? null}
                authError={authError}
                authNotice={authNotice}
                onAuthEmailChange={setAuthEmail}
                onRequestMagicLink={requestMagicLink}
                onSignOut={signOut}
              />

              <SavedDraftPanel
                configured={isSupabaseConfigured}
                isAuthenticated={Boolean(session)}
                roomTitle={draftTitle}
                savedDrafts={savedDrafts}
                activeDraftRoomId={activeDraftRoomId}
                loading={savedDraftLoading}
                error={savedDraftError}
                notice={savedDraftNotice}
                onRoomTitleChange={setDraftTitle}
                onSave={saveCurrentDraft}
                onRefresh={refreshSavedDrafts}
                onLoadSavedDraft={loadSavedDraft}
                onNewDraft={resetDraft}
              />

              <PersonaModeStrip
                personaMode={personaMode}
                presets={PERSONA_PRESETS}
                onChange={setPersonaMode}
              />

              <InsightPanel
                analysis={analysis}
                analyzing={analyzing}
                analysisError={analysisError}
                currentTurn={currentTurn}
                personaLabel={activePersona.label}
              />
            </aside>
          </div>

          <footer className="legal-banner" aria-label="법적 고지">
            <div>
              <strong>LoL Draft Lab은 Riot Games의 공식 제품이 아닙니다.</strong>{" "}
              이 서비스는 실제 게임 세션 중 실시간 우위를 제공하는 도구가 아니라,
              드래프트 학습과 스크림 리뷰를 위한 사전 시뮬레이션 워크스페이스입니다.
            </div>
            <div>
              챔피언 초상화와 이름은 Riot Games의 Data Dragon 공개 자산을
              이용하며, League of Legends 관련 지식재산권은 Riot Games, Inc.에
              귀속됩니다. (© Riot Games, Inc.)
            </div>
            <div>
              공개 베타 전 체크: Riot production key 승인, 약관/개인정보 처리방침
              게시, 시각 자산과 문구에 대한 정책 검수.
            </div>
            {/* TODO(human): 공개 베타 전에 여기 문구를 Riot 정책과 맞춰 최종 법무 문구로 교체해보세요. */}
          </footer>
        </>
      )}
    </div>
  );
}

function estimateRoleMatch(champion: ChampionSummary, role: Role) {
  const tags = new Set(champion.tags);
  const isRanged = champion.stats.attackrange >= 500;

  switch (role) {
    case "TOP":
      return tags.has("Fighter") || tags.has("Tank");
    case "JUNGLE":
      return tags.has("Assassin") || tags.has("Tank") || tags.has("Fighter");
    case "MID":
      return tags.has("Mage") || tags.has("Assassin");
    case "BOTTOM":
      return tags.has("Marksman") || (isRanged && tags.has("Mage"));
    case "SUPPORT":
      return tags.has("Support") || tags.has("Tank") || tags.has("Mage");
    case "FLEX":
      return true;
  }
}

export default App;
