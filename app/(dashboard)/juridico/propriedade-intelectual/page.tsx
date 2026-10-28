import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridico } from "@/lib/juridico-acesso";
import { PropriedadeIntelectualBoard } from "@/components/juridico/propriedade-intelectual-board";
import { SemAcessoAviso } from "@/components/financeiro/sem-valores";
import type { ClienteBasico } from "@/lib/juridico-shared";
import type { PropriedadeIntelectual } from "@/lib/types";

export default async function JuridicoPropriedadeIntelectualPage() {
  const jur = await getAcessoJuridico();
  if (!jur) return <SemAcessoAviso titulo="Propriedade Intelectual" />;
  const supabase = await createClient();

  const [{ data: itens }, { data: clientes }] = await Promise.all([
    supabase
      .from("propriedade_intelectual")
      .select("*")
      .eq("workspace_id", jur.workspaceId)
      .order("data_renovacao", { ascending: true }),
    // Nomes dos clientes: leitura auxiliar, só com permissão em Clientes.
    jur.clientes
      ? supabase
          .from("clientes")
          .select("id, nome")
          .eq("workspace_id", jur.clientes.workspaceId)
          .order("nome")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <PropriedadeIntelectualBoard
      itens={(itens ?? []) as PropriedadeIntelectual[]}
      clientes={(clientes ?? []) as ClienteBasico[]}
      somenteLeitura={jur.somenteLeituraPorCliente}
      clientesIndisponiveis={!jur.clientes}
    />
  );
}
