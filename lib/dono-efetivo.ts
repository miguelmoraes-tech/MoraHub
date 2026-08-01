import { createClient } from "@/lib/supabase/server";
import { getFinanceiroDonoId } from "@/lib/financeiro";
import { getRHDonoId } from "@/lib/rh";
import { getComercialDonoId } from "@/lib/comercial";
import { getMarketingDonoId } from "@/lib/marketing";

/**
 * Which company's data a company-wide screen (Dashboard Executivo, Metas)
 * should operate on: whichever single-company link is currently active
 * (financeiro/rh/comercial/marketing), or the caller's own account
 * otherwise (the empresarial dono browsing their own data). Same
 * resolution order as `getEffectiveDonoIdForSuporte` in lib/suporte.ts —
 * kept as a separate helper (rather than importing that one) since these
 * screens aren't suporte-specific and RLS on `metas_okr` already allows any
 * active colaborador, regardless of papel, to read/write it.
 */
export async function getEffectiveDonoIdGeral(): Promise<string | null> {
  const financeiroDonoId = await getFinanceiroDonoId();
  if (financeiroDonoId) return financeiroDonoId;

  const rhDonoId = await getRHDonoId();
  if (rhDonoId) return rhDonoId;

  const comercialDonoId = await getComercialDonoId();
  if (comercialDonoId) return comercialDonoId;

  const marketingDonoId = await getMarketingDonoId();
  if (marketingDonoId) return marketingDonoId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
