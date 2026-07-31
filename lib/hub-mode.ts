export type HubMode = "business" | "pessoal";

export const HUB_MODE_COOKIE = "hub-mode";

export const MODE_HOME_ROUTE: Record<HubMode, string> = {
  business: "/dashboard/financeiro",
  pessoal: "/pessoal",
};

/** Matches the `perfis.tipo_conta_padrao` check constraint. */
export type AccountType =
  | "empresarial"
  | "pessoal"
  | "contador"
  | "advogado"
  | "financeiro"
  | "rh";

/** Missing/unrecognized values (e.g. accounts predating this column) fall back to business. */
export function accountTypeToHubMode(tipo: string | null | undefined): HubMode {
  return tipo === "pessoal" ? "pessoal" : "business";
}

/**
 * Contador/advogado/financeiro/rh accounts have no business or pessoal hub
 * of their own by default — they land on the linked-accounts picker instead
 * of a HubMode home. Financeiro and RH differ from contador/advogado in that
 * each is capped at one active link (enforced by a DB unique index), not
 * several — see lib/financeiro.ts and lib/rh.ts.
 */
export function isCollaboratorAccountType(tipo: string | null | undefined): boolean {
  return tipo === "contador" || tipo === "advogado" || tipo === "financeiro" || tipo === "rh";
}

/** Where activating/switching to each account type sends the user. */
export const ACCOUNT_TYPE_HOME_ROUTE: Record<AccountType, string> = {
  empresarial: MODE_HOME_ROUTE.business,
  pessoal: MODE_HOME_ROUTE.pessoal,
  contador: "/colaborador",
  advogado: "/colaborador",
  financeiro: "/colaborador",
  rh: "/colaborador",
};

/**
 * The HubMode an account type maps to inside the Business/Pessoal sidebar,
 * or null for contador/advogado/financeiro/rh — those don't have a
 * persistent hub of their own, so they're never the "current" selection in
 * that sidebar.
 */
export function accountTypeHubMode(tipo: AccountType): HubMode | null {
  if (tipo === "pessoal") return "pessoal";
  if (tipo === "empresarial") return "business";
  return null;
}

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
