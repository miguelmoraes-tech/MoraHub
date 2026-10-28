import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro, getAuxiliaresFinanceiro } from "@/lib/financeiro/acesso";
import { ContasReceberBoard } from "@/components/contas-receber-board";
import type { Cliente, ContaReceber, Proposta } from "@/lib/types";

export default async function ContasReceberPage() {
  const fin = await getAcessoFinanceiro();
  const aux = await getAuxiliaresFinanceiro();
  const supabase = await createClient();

  // Clientes e propostas são leituras auxiliares: só com permissão nos módulos deles.
  const [{ data: contas }, { data: clientes }, { data: propostas }] = fin
    ? await Promise.all([
        supabase
          .from("contas_receber")
          .select("*")
          .eq("workspace_id", fin.workspaceId)
          .order("data_vencimento", { ascending: true }),
        aux.clientes
          ? supabase
              .from("clientes")
              .select("*")
              .eq("workspace_id", aux.clientes.workspaceId)
              .order("nome")
          : Promise.resolve({ data: [] }),
        aux.leads
          ? supabase
              .from("propostas")
              .select("*")
              .eq("workspace_id", aux.leads.workspaceId)
              .order("titulo")
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const auxiliarIndisponivel = !aux.clientes || !aux.leads;

  return (
    <ContasReceberBoard
      contas={((contas ?? []) as ContaReceber[]).map((c) =>
        fin?.valores ? c : { ...c, valor: 0 }
      )}
      clientes={(clientes ?? []) as Cliente[]}
      propostas={(propostas ?? []) as Proposta[]}
      // Os campos de cliente e proposta do formulário precisam das listas: sem
      // elas, editar apagaria o vínculo. Por isso a escrita também fica fechada.
      somenteLeitura={!fin || fin.somenteLeitura || auxiliarIndisponivel}
      semValores={!fin?.valores}
      auxiliarIndisponivel={auxiliarIndisponivel}
    />
  );
}
