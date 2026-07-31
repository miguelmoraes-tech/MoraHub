import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { AvaliacoesBoard } from "@/components/rh/avaliacoes-board";
import type { AvaliacaoDesempenho, Funcionario } from "@/lib/types";

export default async function AvaliacoesPage() {
  const donoId = await getEffectiveDonoId();
  const supabase = await createClient();

  const [{ data: avaliacoes }, { data: funcionarios }] = donoId
    ? ((await Promise.all([
        supabase
          .from("avaliacoes_desempenho")
          .select("*")
          .eq("user_id", donoId)
          .order("periodo_referencia", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
      ])) as [{ data: AvaliacaoDesempenho[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as AvaliacaoDesempenho[] }, { data: [] as Funcionario[] }];

  return <AvaliacoesBoard avaliacoes={avaliacoes ?? []} funcionarios={funcionarios ?? []} />;
}
