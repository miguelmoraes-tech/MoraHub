import { createClient } from "@/lib/supabase/server";

/**
 * O workspace "padrão" (o mais antigo) de um usuário para um tipo de conta.
 * Até existir o seletor de múltiplos workspaces do mesmo tipo, todo usuário
 * tem exatamente um — este é o fallback usado sempre que nenhum workspace
 * foi selecionado explicitamente (ou seja, sempre, por enquanto).
 */
export async function getWorkspaceIdPadrao(
  userId: string,
  tipo: "empresarial" | "pessoal"
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("perfis_tipos_ativos")
    .select("id")
    .eq("user_id", userId)
    .eq("tipo", tipo)
    .order("ativado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Workspace de um cliente específico — usado ao criar registros filhos
 * (contratos, comprovantes, assinaturas...) para que herdem o mesmo
 * workspace do cliente pai em vez do workspace padrão de quem está
 * criando (que pode divergir quando o cliente pertence a outro workspace
 * do mesmo dono).
 */
export async function getWorkspaceIdDoCliente(clienteId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("workspace_id")
    .eq("id", clienteId)
    .maybeSingle();
  return (data as { workspace_id: string | null } | null)?.workspace_id ?? null;
}
