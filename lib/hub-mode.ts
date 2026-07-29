export type HubMode = "business" | "pessoal";

export const HUB_MODE_COOKIE = "hub-mode";

export const MODE_HOME_ROUTE: Record<HubMode, string> = {
  business: "/dashboard/financeiro",
  pessoal: "/pessoal",
};

/** Client-only — reads the last mode the user picked via the switcher. */
export function readHubModeCookie(): HubMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )hub-mode=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === "business" || value === "pessoal" ? value : null;
}

/** Client-only — persists the choice so the next login lands in the same mode. */
export function writeHubModeCookie(mode: HubMode) {
  if (typeof document === "undefined") return;
  const oneYearSeconds = 60 * 60 * 24 * 365;
  document.cookie = `${HUB_MODE_COOKIE}=${mode}; path=/; max-age=${oneYearSeconds}; samesite=lax`;
}
