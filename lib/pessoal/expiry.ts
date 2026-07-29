import { diffInDays, todayISO } from "@/lib/vencimentos/dates";
import type { ChipTone } from "@/components/status-chip";

export type ExpiryBadge = { label: string; tone: ChipTone };

const EXPIRY_WINDOW_DAYS = 30;

/**
 * No badge if there's no `expiresAt`, or if it's more than 30 days out.
 * Tone follows the same red=atrasado / amber=vence-em-breve convention used
 * by the Business-mode Calendário, not the acervo-pessoal original's
 * (inverted) mapping.
 */
export function getExpiryBadge(expiresAt: string | null): ExpiryBadge | null {
  if (!expiresAt) return null;

  const today = todayISO();
  const diffDays = diffInDays(today, expiresAt);

  if (diffDays < 0) return { label: "Vencido", tone: "rose" };
  if (diffDays === 0) return { label: "Vence hoje", tone: "rose" };
  if (diffDays <= EXPIRY_WINDOW_DAYS) {
    return { label: `Vence em ${diffDays}d`, tone: "amber" };
  }
  return null;
}
