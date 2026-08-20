export const SKIN_IDS = ["classic", "neon", "retro"] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export const DEFAULT_SKIN: SkinId = "classic";

export const SKIN_LABELS: Record<SkinId, string> = {
  classic: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export function isSkinId(v: string | null): v is SkinId {
  return !!v && (SKIN_IDS as readonly string[]).includes(v);
}

export function skinStorageKey(gameId: string): string {
  return `av_skin_${gameId}`;
}
