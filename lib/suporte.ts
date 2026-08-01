import { createClient } from "@/lib/supabase/server";
import { getFinanceiroDonoId } from "@/lib/financeiro";
import { getRHDonoId } from "@/lib/rh";
import { getComercialDonoId } from "@/lib/comercial";
import { getMarketingDonoId } from "@/lib/marketing";

/**
 * Which company's tickets the /suporte page (inside the empresarial
 * dashboard layout) should operate on: whichever single-company link is
 * currently active (financeiro/rh/comercial/marketing), or the caller's own
 * account otherwise (the empresarial dono browsing their own data).
 * Advogado and contador — not capped to one company — use their own
 * multi-conta fetch instead of this helper (see
 * app/colaborador/*\/suporte/page.tsx).
 */
export async function getEffectiveDonoIdForSuporte(): Promise<string | null> {
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
