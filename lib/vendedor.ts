import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva } from "@/lib/empresa-ativa";
import {
  VENDEDOR_HOME,
  getVendedorAcesso,
  isComercialSemVinculo,
} from "@/lib/vendedor-access";
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
  somenteVendedor: boolean;
}

/**
 * The vendedor session for the current request, or null when the caller is
 * not an active 'comercial' member. With several links, the active company
 * (lib/empresa-ativa.ts) wins when the caller is a vendedor there; it is only a
 * hint — it must match a link that is still 'ativo' in `membros`.
 */
export const getVendedorContext = cache(
  async (): Promise<VendedorContext | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const acesso = await getVendedorAcesso(supabase, user.id);
    if (acesso.vinculos.length === 0) return null;

    const ativa = await getEmpresaAtiva();
    const vinculo =
      acesso.vinculos.find((v) => v.workspace_id === ativa?.workspaceId) ??
      acesso.vinculos[0];

    return {
      userId: user.id,
      email: user.email ?? "",
      workspaceId: vinculo.workspace_id,
      donoId: vinculo.dono_id,
      somenteVendedor: acesso.somenteVendedor,
    };
  }
);

/** Page/action guard: anonymous -> /login, non-vendedor -> /. */
export async function requireVendedor(): Promise<VendedorContext> {
  const ctx = await getVendedorContext();
  if (ctx) return ctx;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/" : "/login");
}

export interface SemVinculoContext {
  email: string;
  /** The caller's most recent request for access (any status), if any. */
  ultima: SolicitacaoVendedor | null;
}

/**
 * Guard for the code / "aguardando aprovação" screens. The proxy already keeps
 * a comercial account without a link on these two screens; this is the other
 * half: whoever is not in that state is sent where they belong (a linked
 * vendedor to their area, anyone else to the app).
 */
export async function requireComercialSemVinculo(): Promise<SemVinculoContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const acesso = await getVendedorAcesso(supabase, user.id);
  if (acesso.somenteVendedor) redirect(VENDEDOR_HOME);
  if (!(await isComercialSemVinculo(supabase, user, acesso))) redirect("/");

  const { data } = await supabase
    .from("solicitacoes_vendedor")
    .select("id, workspace_id, user_id, email, status, created_at, respondido_em")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    email: user.email ?? "",
    ultima: (data as SolicitacaoVendedor | null) ?? null,
  };
}
