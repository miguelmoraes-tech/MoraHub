import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who counts as a "vendedor" — shared by the proxy (route blocking) and the
 * server pages/layouts. Takes the Supabase client as an argument instead of
 * importing lib/supabase/server, because the proxy builds its own client
 * from the request cookies.
 */

export interface VendedorVinculo {
  dono_id: string;
  workspace_id: string;
}

export interface VendedorAcesso {
  /** Active 'comercial' links that point at a concrete workspace. */
  vinculos: VendedorVinculo[];
  /**
   * True when the account's only role is vendedor: it has an active
   * 'comercial' link, no other collaborator link and no 'empresarial'
   * workspace of its own. Only these accounts are locked into /vendedor/*.
   */
  somenteVendedor: boolean;
  /** True when the account has any active `membros` link, whatever the papel. */
  temMembroAtivo: boolean;
}

type MembroRow = { dono_id: string; papel: string; workspace_id: string | null };

/**
 * RLS ("dono e membro veem o vinculo") lets the caller read their own membros
 * rows, so this runs with the user's session — no service key involved.
 */
export async function getVendedorAcesso(
  supabase: SupabaseClient,
  userId: string
): Promise<VendedorAcesso> {
  const { data } = await supabase
    .from("membros")
    .select("dono_id, papel, workspace_id")
    .eq("membro_id", userId)
    .eq("status", "ativo");
  const membros = (data ?? []) as MembroRow[];

  const vinculos = membros
    .filter((m) => m.papel === "comercial" && m.workspace_id)
    .map((m) => ({ dono_id: m.dono_id, workspace_id: m.workspace_id as string }));

  if (vinculos.length === 0 || membros.some((m) => m.papel !== "comercial")) {
    return { vinculos, somenteVendedor: false, temMembroAtivo: membros.length > 0 };
  }

  const { data: proprios } = await supabase
    .from("perfis_tipos_ativos")
    .select("id")
    .eq("user_id", userId)
    .eq("tipo", "empresarial")
    .limit(1);

  return {
    vinculos,
    somenteVendedor: (proprios ?? []).length === 0,
    temMembroAtivo: true,
  };
}

/**
 * A person who signed up as a vendedor ("comercial") and is not linked to any
 * company yet — they only get the screens to ask their gestor for access
 * (ACESSO_VENDEDOR_*), nothing else. Anyone with an active link of any papel,
 * or with another account type active (empresarial, pessoal, contador...), is
 * never in this state.
 *
 * `tipo_conta_padrao` from the signup metadata is only a cheap pre-filter, so
 * every other account skips the extra query on each request; the DB rows are
 * the authority. With e-mail confirmation on, the `perfis_tipos_ativos` row
 * does not exist until the first login, so empty rows fall back to the
 * metadata.
 */
export async function isComercialSemVinculo(
  supabase: SupabaseClient,
  user: { id: string; user_metadata?: Record<string, unknown> },
  acesso: VendedorAcesso
): Promise<boolean> {
  if (acesso.temMembroAtivo) return false;
  if (user.user_metadata?.tipo_conta_padrao !== "comercial") return false;

  const { data } = await supabase
    .from("perfis_tipos_ativos")
    .select("tipo")
    .eq("user_id", user.id);
  const tipos = (data ?? []).map((r) => (r as { tipo: string }).tipo);
  return tipos.every((t) => t === "comercial");
}

export const VENDEDOR_HOME = "/vendedor/leads";
export const VENDEDOR_PREFIX = "/vendedor";

/** Where a vendedor without a link types the gestor's code, and waits for the answer. */
export const ACESSO_VENDEDOR_CODIGO = "/acesso-vendedor";
export const ACESSO_VENDEDOR_AGUARDANDO = "/acesso-vendedor/aguardando";

/** Paths a somenteVendedor session may open; everything else is bounced to VENDEDOR_HOME. */
export function isRotaDoVendedor(path: string): boolean {
  return path === VENDEDOR_PREFIX || path.startsWith(`${VENDEDOR_PREFIX}/`);
}

/** The only paths a comercial account without a link may open. */
export function isRotaDeAcessoVendedor(path: string): boolean {
  return path === ACESSO_VENDEDOR_CODIGO || path === ACESSO_VENDEDOR_AGUARDANDO;
}
