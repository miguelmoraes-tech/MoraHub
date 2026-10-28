import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { PontoBoard } from "@/components/rh/ponto-board";
import type { ControlePonto, Funcionario } from "@/lib/types";

export default async function PontoPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: registros }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("controle_ponto")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("data", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", "ativo")
          .order("nome", { ascending: true }),
      ])) as [{ data: ControlePonto[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as ControlePonto[] }, { data: [] as Funcionario[] }];

  return <PontoBoard registros={registros ?? []} funcionarios={funcionarios ?? []} />;
}
