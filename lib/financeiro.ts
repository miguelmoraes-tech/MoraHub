import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Which company a financeiro-linked session is currently acting on. */
export const FINANCEIRO_DONO_COOKIE = "financeiro-dono-id";
export const FINANCEIRO_DONO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Re-validated on every call (not trusted from the cookie alone): confirms
 * the membros row is still 'ativo' with papel 'financeiro', so a revoked
 * link (or a tampered cookie) falls back to null instead of leaking access.
 */
export async function getFinanceiroDonoId(): Promise<string | null> {
  const cookieStore = await cookies();
  const donoId = cookieStore.get(FINANCEIRO_DONO_COOKIE)?.value;
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
    .eq("papel", "financeiro")
    .eq("status", "ativo")
    .maybeSingle();

  return data ? donoId : null;
}

/**
 * Which account's data the financial pages (Contas a Pagar/Receber,
 * Orçamento, Fluxo de Caixa) should operate on: the one company a
 * financeiro session is acting on, or the caller's own account otherwise
 * (the empresarial dono browsing their own data).
 */
export async function getEffectiveDonoId(): Promise<string | null> {
  const financeiroDonoId = await getFinanceiroDonoId();
  if (financeiroDonoId) return financeiroDonoId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
