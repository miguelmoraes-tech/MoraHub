import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const MARKETING_DONO_COOKIE = "marketing-dono-id";
export const MARKETING_DONO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Re-validated on every call (not trusted from the cookie alone): confirms
 * the membros row is still 'ativo' with papel 'marketing', so a revoked link
 * (or a tampered cookie) falls back to null instead of leaking access.
 */
export async function getMarketingDonoId(): Promise<string | null> {
  const cookieStore = await cookies();
  const donoId = cookieStore.get(MARKETING_DONO_COOKIE)?.value;
  if (!donoId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("membros")
    .select("id")
    .eq("dono_id", donoId)
    .eq("membro_id", user.id)
    .eq("papel", "marketing")
    .eq("status", "ativo")
    .maybeSingle();

  return data ? donoId : null;
}

/**
 * Which account's data the Marketing-only pages (Visão Geral, Calendário de
 * Conteúdo, Campanhas) should operate on: the one company a Marketing
 * session is acting on, or the caller's own account otherwise (the
 * empresarial dono browsing their own data).
 */
export async function getEffectiveDonoIdForMarketing(): Promise<string | null> {
  const marketingDonoId = await getMarketingDonoId();
  if (marketingDonoId) return marketingDonoId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
