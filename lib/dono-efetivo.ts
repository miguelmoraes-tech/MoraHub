import { createClient } from "@/lib/supabase/server";
import { getFinanceiroDonoId } from "@/lib/financeiro";
import { getRHDonoId } from "@/lib/rh";
import { getComercialDonoId } from "@/lib/comercial";
import { getMarketingDonoId } from "@/lib/marketing";
import { getWorkspaceIdPadrao } from "@/lib/workspace";

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

async function getMembroWorkspaceId(
  donoId: string,
  membroId: string,
  papel: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("membros")
    .select("workspace_id")
    .eq("dono_id", donoId)
    .eq("membro_id", membroId)
    .eq("papel", papel)
    .eq("status", "ativo")
    .maybeSingle();
  return (data as { workspace_id: string | null } | null)?.workspace_id ?? null;
}

/**
 * Workspace ('empresarial') que uma tela geral da empresa deve enxergar:
 * quando uma sessão de colaborador (financeiro/rh/comercial/marketing) está
 * ativa, é o workspace daquele vínculo específico em `membros` — não
 * necessariamente o workspace padrão do dono, para já refletir corretamente
 * o dia em que um convite passar a ser emitido para um workspace específico
 * (em vez de sempre o "padrão"). Sem sessão de colaborador, é o workspace
 * padrão do próprio usuário.
 */
export async function getEffectiveWorkspaceIdGeral(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const financeiroDonoId = await getFinanceiroDonoId();
  if (financeiroDonoId) return getMembroWorkspaceId(financeiroDonoId, user.id, "financeiro");

  const rhDonoId = await getRHDonoId();
  if (rhDonoId) return getMembroWorkspaceId(rhDonoId, user.id, "rh");

  const comercialDonoId = await getComercialDonoId();
  if (comercialDonoId) return getMembroWorkspaceId(comercialDonoId, user.id, "comercial");

  const marketingDonoId = await getMarketingDonoId();
  if (marketingDonoId) return getMembroWorkspaceId(marketingDonoId, user.id, "marketing");

  return getWorkspaceIdPadrao(user.id, "empresarial");
}
