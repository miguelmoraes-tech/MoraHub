import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { VagasBoard } from "@/components/rh/vagas-board";
import type { Candidato, Departamento, Vaga } from "@/lib/types";

export default async function RecrutamentoPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: vagas }, { data: departamentos }, { data: candidatos }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("vagas")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("departamentos")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
        supabase.from("candidatos").select("*").eq("workspace_id", workspaceId),
      ])) as [
        { data: Vaga[] | null },
        { data: Departamento[] | null },
        { data: Candidato[] | null },
      ])
    : [{ data: [] as Vaga[] }, { data: [] as Departamento[] }, { data: [] as Candidato[] }];

  return (
    <VagasBoard
      vagas={vagas ?? []}
      departamentos={departamentos ?? []}
      candidatos={candidatos ?? []}
    />
  );
}
