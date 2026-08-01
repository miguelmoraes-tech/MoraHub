import type { Lead } from "@/lib/types";

/**
 * A lead needs follow-up attention today: a next-contact date has passed
 * (or is today), it hasn't been converted, and it wasn't already declined.
 */
export function isFollowupPendente(
  lead: Pick<Lead, "proximo_followup" | "status" | "resultado">,
  hojeISO: string
): boolean {
  return (
    !!lead.proximo_followup &&
    lead.proximo_followup <= hojeISO &&
    lead.status !== "convertido" &&
    lead.resultado !== "negou"
  );
}
