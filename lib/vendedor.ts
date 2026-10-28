import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva } from "@/lib/empresa-ativa";
import type { SolicitacaoVendedor } from "@/lib/vendedor-shared";

export {
  VENDEDOR_HOME,
  isRotaDoVendedor,
  type VendedorAcesso,
} from "@/lib/vendedor-access";

export interface VendedorContext {
  userId: string;
  email: string;
  /** Workspace whose leads/reuniões the vendedor is acting on. */
  workspaceId: string;
  donoId: string;
}

/**
 * The vendedor session for the current request, or null when the ACTIVE
 * company is not one where the caller is a 'comercial' member. The interface
 * depends on the papel in the active company (lib/empresa-ativa.ts, always
 * revalidated in the database), never on the user as a whole.
 */
export const getVendedorContext = cache(
  async (): Promise<VendedorContext | null> => {
    const ativa = await getEmpresaAtiva();
    if (!ativa || ativa.papel !== "comercial") return null;

    return {
      userId: ativa.userId,
      email: ativa.email,
      workspaceId: ativa.workspaceId,
      donoId: ativa.donoId,
    };
  }
);

/**
 * Page/action guard: anonymous -> /login; anyone who is not a vendedor in the
 * active company -> "sem acesso" (a page the proxy never redirects away from,
 * so a mismatch can't bounce between /dashboard and /vendedor/*).
 */
export async function requireVendedor(): Promise<VendedorContext> {
  const ctx = await getVendedorContext();
  if (ctx) return ctx;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/sem-acesso?erro=1" : "/login");
}

export interface SolicitacaoContext {
  userId: string;
  email: string;
  /** The caller's most recent request for access (any status), if any. */
  ultima: SolicitacaoVendedor | null;
}

/**
 * Guard for the code / "aguardando aprovação" screens. Any logged-in account
 * may open them, with or without a company — the proxy already sends the
 * anonymous to /login; this repeats it and loads the latest request.
 */
export async function requireUsuarioComSolicitacao(): Promise<SolicitacaoContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("solicitacoes_vendedor")
    .select("id, workspace_id, user_id, email, status, created_at, respondido_em")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    ultima: (data as SolicitacaoVendedor | null) ?? null,
  };
}
