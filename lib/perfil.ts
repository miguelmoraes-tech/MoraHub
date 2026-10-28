import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AccountType } from "@/lib/hub-mode";

/**
 * Escritas idempotentes de perfil e de tipos ativos. `perfis_tipos_ativos`
 * NÃO tem constraint única em (user_id, tipo) — só a chave primária e a regra
 * de tipos —, então nada aqui usa upsert/onConflict: é select e, se faltar,
 * insert. Contas de teste antigas ficaram sem linha em `perfis`; por isso o
 * primeiro login também a cria.
 */

const TIPOS_CONTA: AccountType[] = [
  "empresarial",
  "pessoal",
  "contador",
  "advogado",
  "financeiro",
  "rh",
  "comercial",
  "marketing",
];

export function tipoContaDaMetadata(user: Pick<User, "user_metadata">): AccountType | null {
  const tipo = user.user_metadata?.tipo_conta_padrao;
  return TIPOS_CONTA.find((t) => t === tipo) ?? null;
}

/** Cria a linha de `perfis` se não existir (a escolha do cadastro está na metadata). */
export async function garantirPerfil(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "user_metadata">
): Promise<{ ok: boolean }> {
  const { data: existente, error: erroLeitura } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (erroLeitura) return { ok: false };
  if (existente) return { ok: true };

  const nome = user.user_metadata?.nome;
  const { error } = await supabase.from("perfis").insert({
    id: user.id,
    nome: typeof nome === "string" && nome !== "" ? nome : null,
    tipo_conta_padrao: tipoContaDaMetadata(user) ?? "empresarial",
  });
  return { ok: !error };
}

/**
 * Garante UMA linha do tipo em `perfis_tipos_ativos`. `criado` é true só na
 * primeira ativação. Para 'empresarial' prefira criarEmpresaInicial, que exige
 * nome.
 */
export async function garantirTipoAtivo(
  supabase: SupabaseClient,
  userId: string,
  tipo: AccountType,
  nome?: string
): Promise<{ ok: boolean; criado: boolean }> {
  const { data: existente, error: erroLeitura } = await supabase
    .from("perfis_tipos_ativos")
    .select("id")
    .eq("user_id", userId)
    .eq("tipo", tipo)
    .limit(1)
    .maybeSingle();
  if (erroLeitura) return { ok: false, criado: false };
  if (existente) return { ok: true, criado: false };

  const { error } = await supabase
    .from("perfis_tipos_ativos")
    .insert({ user_id: userId, tipo, ...(nome ? { nome } : {}) });
  return { ok: !error, criado: !error };
}

/** True se a conta tem ao menos uma empresa própria (perfis_tipos_ativos 'empresarial'). */
export async function temEmpresaPropria(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("perfis_tipos_ativos")
    .select("id")
    .eq("user_id", userId)
    .eq("tipo", "empresarial")
    .limit(1);
  return (data ?? []).length > 0;
}
