import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { AvaliacoesBoard } from "@/components/rh/avaliacoes-board";
import type { AvaliacaoDesempenho, Funcionario } from "@/lib/types";

export default async function AvaliacoesPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: avaliacoes }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("avaliacoes_desempenho")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("periodo_referencia", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: AvaliacaoDesempenho[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as AvaliacaoDesempenho[] }, { data: [] as Funcionario[] }];

  return <AvaliacoesBoard avaliacoes={avaliacoes ?? []} funcionarios={funcionarios ?? []} />;
}
