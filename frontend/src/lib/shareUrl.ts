import type { DraftPickInput, DraftState, PersonaMode, Role } from "../types";

type CompactPick = [string, string | null];

type SharePayload = {
  v: 1;
  bb?: string[];
  rb?: string[];
  bp?: CompactPick[];
  rp?: CompactPick[];
  pm?: PersonaMode;
};

const PARAM_KEY = "d";

const PERSONA_MODES: readonly PersonaMode[] = [
  "general",
  "pro",
  "veteran",
  "new",
  "coach",
  "director",
];

const ROLES: readonly Role[] = [
  "TOP",
  "JUNGLE",
  "MID",
  "BOTTOM",
  "SUPPORT",
  "FLEX",
];

function toCompact(picks: DraftPickInput[]): CompactPick[] {
  return picks.map((pick) => [pick.champion_id, pick.role ?? null]);
}

function fromCompact(picks: CompactPick[] | undefined): DraftPickInput[] {
  if (!Array.isArray(picks)) {
    return [];
  }
  const result: DraftPickInput[] = [];
  for (const entry of picks) {
    if (!Array.isArray(entry) || entry.length < 1) {
      continue;
    }
    const [championId, role] = entry;
    if (typeof championId !== "string" || championId.length === 0) {
      continue;
    }
    const normalizedRole =
      typeof role === "string" && (ROLES as readonly string[]).includes(role)
        ? (role as Role)
        : null;
    result.push({ champion_id: championId, role: normalizedRole });
  }
  return result;
}

function base64UrlEncode(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(token: string): string {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeShareState(
  draft: DraftState,
  personaMode: PersonaMode,
): string {
  const payload: SharePayload = { v: 1 };
  if (draft.blue_bans.length) payload.bb = draft.blue_bans;
  if (draft.red_bans.length) payload.rb = draft.red_bans;
  if (draft.blue_picks.length) payload.bp = toCompact(draft.blue_picks);
  if (draft.red_picks.length) payload.rp = toCompact(draft.red_picks);
  if (personaMode !== "general") payload.pm = personaMode;
  return base64UrlEncode(JSON.stringify(payload));
}

export function buildShareUrl(
  draft: DraftState,
  personaMode: PersonaMode,
): string {
  const token = encodeShareState(draft, personaMode);
  if (typeof window === "undefined") {
    return `?${PARAM_KEY}=${token}`;
  }
  return `${window.location.origin}${window.location.pathname}?${PARAM_KEY}=${token}`;
}

export function readShareTokenFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(PARAM_KEY);
}

export function clearShareTokenFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM_KEY);
  const search = url.searchParams.toString();
  const next = url.pathname + (search ? `?${search}` : "") + url.hash;
  window.history.replaceState({}, "", next);
}

export type DecodedShareState = {
  draft: DraftState;
  personaMode: PersonaMode;
};

export function decodeShareState(token: string): DecodedShareState | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(token)) as SharePayload;
    if (parsed.v !== 1) {
      return null;
    }
    const personaMode =
      parsed.pm &&
      (PERSONA_MODES as readonly string[]).includes(parsed.pm)
        ? parsed.pm
        : "general";
    const draft: DraftState = {
      blue_bans: Array.isArray(parsed.bb)
        ? parsed.bb.filter((value): value is string => typeof value === "string")
        : [],
      red_bans: Array.isArray(parsed.rb)
        ? parsed.rb.filter((value): value is string => typeof value === "string")
        : [],
      blue_picks: fromCompact(parsed.bp),
      red_picks: fromCompact(parsed.rp),
    };
    return { draft, personaMode };
  } catch {
    return null;
  }
}
