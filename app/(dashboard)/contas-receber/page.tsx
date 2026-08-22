import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId, getEffectiveWorkspaceId } from "@/lib/financeiro";
import { ContasReceberBoard } from "@/components/contas-receber-board";
import type { Cliente, ContaReceber, Proposta } from "@/lib/types";

export default async function ContasReceberPage() {
  const donoId = await getEffectiveDonoId();
  const workspaceId = await getEffectiveWorkspaceId();
  const supabase = await createClient();

  const [{ data: contas }, { data: clientes }, { data: propostas }] = donoId
    ? await Promise.all([
        supabase
          .from("contas_receber")
          .select("*")
          .eq("workspace_id", workspaceId ?? "")
          .order("data_vencimento", { ascending: true }),
        supabase
          .from("clientes")
          .select("*")
          .eq("workspace_id", workspaceId ?? "")
          .order("nome"),
        supabase
          .from("propostas")
          .select("*")
          .eq("workspace_id", workspaceId ?? "")
          .order("titulo"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <ContasReceberBoard
      contas={(contas ?? []) as ContaReceber[]}
      clientes={(clientes ?? []) as Cliente[]}
      propostas={(propostas ?? []) as Proposta[]}
    />
  );
}
