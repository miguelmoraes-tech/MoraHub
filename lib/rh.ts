import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getFinanceiroDonoId } from "@/lib/financeiro";

/** Which company an RH-linked session is currently acting on. */
export const RH_DONO_COOKIE = "rh-dono-id";
export const RH_DONO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Re-validated on every call (not trusted from the cookie alone): confirms
 * the membros row is still 'ativo' with papel 'rh', so a revoked link (or a
 * tampered cookie) falls back to null instead of leaking access.
 */
export async function getRHDonoId(): Promise<string | null> {
  const cookieStore = await cookies();
  const donoId = cookieStore.get(RH_DONO_COOKIE)?.value;
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
    .eq("papel", "rh")
    .eq("status", "ativo")
    .maybeSingle();

  return data ? donoId : null;
}

/**
 * Which account's data the RH-only pages (Departamentos, Funcionários,
 * Férias, Benefícios, Recrutamento, Avaliações, Ponto, Visão Geral) should
 * operate on: the one company an RH session is acting on, or the caller's
 * own account otherwise (the empresarial dono browsing their own data).
 */
export async function getEffectiveDonoIdForRH(): Promise<string | null> {
  const rhDonoId = await getRHDonoId();
  if (rhDonoId) return rhDonoId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Folha de Pagamento is the one RH screen Financeiro keeps access to (it's
 * also where contas_pagar sync lives) — so it resolves against either link,
 * checking Financeiro first since that's the more established path.
 */
export async function getEffectiveDonoIdForFolha(): Promise<string | null> {
  const financeiroDonoId = await getFinanceiroDonoId();
  if (financeiroDonoId) return financeiroDonoId;

  return getEffectiveDonoIdForRH();
}
