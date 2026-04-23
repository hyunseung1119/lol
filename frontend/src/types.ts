export type TeamSide = "blue" | "red";
export type DraftActionType = "pick" | "ban";
export type DraftMode = "tournament";
export type Role = "TOP" | "JUNGLE" | "MID" | "BOTTOM" | "SUPPORT" | "FLEX";
export type PersonaMode =
  | "general"
  | "pro"
  | "veteran"
  | "new"
  | "coach"
  | "director";

export type ChampionInfo = {
  attack: number;
  defense: number;
  magic: number;
  difficulty: number;
};

export type ChampionStats = {
  hp: number;
  armor: number;
  attackrange: number;
  movespeed: number;
};

export type ChampionSummary = {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  partype: string;
  image: string;
  info: ChampionInfo;
  stats: ChampionStats;
};

export type DraftPickInput = {
  champion_id: string;
  role?: Role | null;
};

export type RecommendationBreakdown = {
  role_fit: number;
  synergy: number;
  counter: number;
  patch: number;
  comfort: number;
  persona: number;
};

export type RecommendationItem = {
  champion_id: string;
  champion_name: string;
  role: Role;
  recommendation_score: number;
  estimated_win_rate: number;
  patch_bias: number;
  reasons: string[];
  tags: string[];
  breakdown: RecommendationBreakdown;
};

export type TeamProfile = {
  physical_damage: number;
  magic_damage: number;
  frontline: number;
  engage: number;
  peel: number;
  poke: number;
  pick: number;
  scaling: number;
};

export type DraftAnalysisResponse = {
  patch: string;
  season_label: string;
  ddragon_version: string;
  side_to_act: TeamSide;
  action_type: DraftActionType;
  suggested_role: Role;
  persona_mode: PersonaMode;
  blue_estimated_win_rate: number;
  red_estimated_win_rate: number;
  confidence: number;
  explanation: string;
  top_picks: RecommendationItem[];
  top_bans: RecommendationItem[];
  blue_profile: TeamProfile;
  red_profile: TeamProfile;
  warnings: string[];
};

export type MetaResponse = {
  app_name: string;
  patch: string;
  season_label: string;
  ddragon_version: string;
  champion_count: number;
  riot_api_configured: boolean;
  supported_modes: DraftMode[];
};

export type DraftTurn = {
  side: TeamSide;
  action: DraftActionType;
  label: string;
  phase: string;
  sequenceIndex: number;
};

export type DraftState = {
  blue_bans: string[];
  red_bans: string[];
  blue_picks: DraftPickInput[];
  red_picks: DraftPickInput[];
};
