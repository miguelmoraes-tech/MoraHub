import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { FeriasBoard } from "@/components/rh/ferias-board";
import type { Feria, Funcionario } from "@/lib/types";

export default async function FeriasPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: ferias }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("ferias")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("periodo_aquisitivo_fim", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: Feria[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as Feria[] }, { data: [] as Funcionario[] }];

  return <FeriasBoard ferias={ferias ?? []} funcionarios={funcionarios ?? []} />;
}
