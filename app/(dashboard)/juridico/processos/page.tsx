import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridico } from "@/lib/juridico-acesso";
import { ProcessosBoard } from "@/components/juridico/processos-board";
import { SemAcessoAviso } from "@/components/financeiro/sem-valores";
import type { ClienteBasico } from "@/lib/juridico-shared";
import type { Processo } from "@/lib/types";

export default async function JuridicoProcessosPage() {
  const jur = await getAcessoJuridico();
  if (!jur) return <SemAcessoAviso titulo="Processos" />;
  const supabase = await createClient();

  const [{ data: processos }, { data: clientes }] = await Promise.all([
    supabase
      .from("processos")
      .select("*")
      .eq("workspace_id", jur.workspaceId)
      .order("proximo_prazo", { ascending: true }),
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
    <ProcessosBoard
      processos={(processos ?? []) as Processo[]}
      clientes={(clientes ?? []) as ClienteBasico[]}
      somenteLeitura={jur.somenteLeituraPorCliente}
      clientesIndisponiveis={!jur.clientes}
    />
  );
}
