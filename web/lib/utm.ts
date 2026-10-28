export const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;

const UTM_MAX_LENGTH = 100;

/** UTM params from the landing URL; empty values omitted. Client-only. */
export function readUtm(search: string = window.location.search): Utm {
  const params = new URLSearchParams(search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`)?.trim();
    if (value) utm[key] = value.slice(0, UTM_MAX_LENGTH);
  }
  return utm;
}
