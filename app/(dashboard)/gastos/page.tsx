import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro, getAuxiliaresFinanceiro } from "@/lib/financeiro/acesso";
import { GastosSection } from "@/components/gastos-section";
import type { Gasto, Cliente, Projeto } from "@/lib/types";

export default async function GastosPage() {
  const supabase = await createClient();
  const fin = await getAcessoFinanceiro();
  const aux = await getAuxiliaresFinanceiro();

  // Cliente e projeto são leituras auxiliares: só com permissão em Clientes.
  const [{ data: gastos }, { data: clientes }, { data: projetos }] = fin
    ? ((await Promise.all([
        supabase
          .from("gastos")
          .select("*")
          .eq("workspace_id", fin.workspaceId)
          .order("data", { ascending: false }),
        aux.clientes
          ? supabase
              .from("clientes")
              .select("*")
              .eq("workspace_id", aux.clientes.workspaceId)
              .order("nome")
          : Promise.resolve({ data: [] }),
        aux.clientes
          ? supabase
              .from("projetos")
              .select("*")
              .eq("workspace_id", aux.clientes.workspaceId)
              .order("nome")
          : Promise.resolve({ data: [] }),
      ])) as [
        { data: Gasto[] | null },
        { data: Cliente[] | null },
        { data: Projeto[] | null },
      ])
    : [{ data: [] as Gasto[] }, { data: [] as Cliente[] }, { data: [] as Projeto[] }];

  return (
    <GastosSection
      gastos={(gastos ?? []).map((g) => (fin?.valores ? g : { ...g, valor: 0 }))}
      clientes={clientes ?? []}
      projetos={projetos ?? []}
      // Os selects de cliente/projeto precisam das listas: sem elas, editar
      // apagaria o vínculo. Por isso a escrita também fica fechada.
      somenteLeitura={!fin || fin.somenteLeitura || !aux.clientes}
      semValores={!fin?.valores}
      auxiliarIndisponivel={!aux.clientes}
    />
  );
}
