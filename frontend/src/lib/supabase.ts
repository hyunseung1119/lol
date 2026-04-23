import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  DraftPickInput,
  StoredDraftRoom,
  TeamSide,
  DraftActionType,
  PersonaMode,
} from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const DRAFT_ROOM_SELECT =
  "id,title,patch,persona_mode,side_to_act,action_type,updated_at,blue_bans,red_bans,blue_picks,red_picks,preferred_champions,blue_estimated_win_rate,red_estimated_win_rate,confidence,explanation";

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    const url = supabaseUrl;
    const anonKey = supabaseAnonKey;

    if (!url || !anonKey) {
      return null;
    }

    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export type DraftRoomRow = {
  id: string;
  title: string;
  patch: string;
  persona_mode: PersonaMode;
  side_to_act: TeamSide;
  action_type: DraftActionType;
  updated_at: string;
  blue_bans: unknown;
  red_bans: unknown;
  blue_picks: unknown;
  red_picks: unknown;
  preferred_champions: unknown;
  blue_estimated_win_rate: number | null;
  red_estimated_win_rate: number | null;
  confidence: number | null;
  explanation: string | null;
};

export function mapDraftRoomRow(row: DraftRoomRow): StoredDraftRoom {
  return {
    id: row.id,
    title: row.title,
    patch: row.patch,
    persona_mode: row.persona_mode,
    side_to_act: row.side_to_act,
    action_type: row.action_type,
    updated_at: row.updated_at,
    blue_bans: coerceStringArray(row.blue_bans),
    red_bans: coerceStringArray(row.red_bans),
    blue_picks: coercePickArray(row.blue_picks),
    red_picks: coercePickArray(row.red_picks),
    preferred_champions: coerceStringArray(row.preferred_champions),
    blue_estimated_win_rate: row.blue_estimated_win_rate,
    red_estimated_win_rate: row.red_estimated_win_rate,
    confidence: row.confidence,
    explanation: row.explanation,
  };
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function coercePickArray(value: unknown): DraftPickInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const picks: DraftPickInput[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const championId =
      "champion_id" in item && typeof item.champion_id === "string"
        ? item.champion_id
        : null;

    if (!championId) {
      return;
    }

    const role =
      "role" in item && (typeof item.role === "string" || item.role === null)
        ? item.role
        : null;

    picks.push({ champion_id: championId, role });
  });

  return picks;
}
