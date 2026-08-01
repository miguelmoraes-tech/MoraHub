import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdPadrao } from "@/lib/workspace";

/** Which company a comercial-linked session is currently acting on. */
export const COMERCIAL_DONO_COOKIE = "comercial-dono-id";
export const COMERCIAL_DONO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Re-validated on every call (not trusted from the cookie alone): confirms
 * the membros row is still 'ativo' with papel 'comercial', so a revoked
 * link (or a tampered cookie) falls back to null instead of leaking access.
 */
export async function getComercialDonoId(): Promise<string | null> {
  const cookieStore = await cookies();
  const donoId = cookieStore.get(COMERCIAL_DONO_COOKIE)?.value;
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
    .eq("papel", "comercial")
    .eq("status", "ativo")
    .maybeSingle();

  return data ? donoId : null;
}

/**
 * Which account's data the comercial pages (Visão Geral, Funil de Vendas)
 * should operate on: the one company a comercial session is acting on, or
 * the caller's own account otherwise (the empresarial dono browsing their
 * own data).
 */
export async function getEffectiveDonoIdForComercial(): Promise<string | null> {
  const comercialDonoId = await getComercialDonoId();
  if (comercialDonoId) return comercialDonoId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Workspace ('empresarial') que as telas de Comercial (Funil de Vendas,
 * Follow-ups) devem enxergar: o do vínculo `membros` específico quando uma
 * sessão comercial está ativa, senão o workspace padrão do próprio usuário.
 */
export async function getEffectiveWorkspaceIdForComercial(): Promise<string | null> {
  const cookieStore = await cookies();
  const donoIdCookie = cookieStore.get(COMERCIAL_DONO_COOKIE)?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (donoIdCookie) {
    const { data } = await supabase
      .from("membros")
      .select("workspace_id")
      .eq("dono_id", donoIdCookie)
      .eq("membro_id", user.id)
      .eq("papel", "comercial")
      .eq("status", "ativo")
      .maybeSingle();
    return (data as { workspace_id: string | null } | null)?.workspace_id ?? null;
  }

  return getWorkspaceIdPadrao(user.id, "empresarial");
}
