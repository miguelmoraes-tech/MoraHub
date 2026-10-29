import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerSalarios } from "@/lib/rh/salarios";
import { VagasBoard } from "@/components/rh/vagas-board";
import type { Candidato, Departamento, Vaga } from "@/lib/types";

export default async function RecrutamentoPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  // Salários são do extra "salarios" (só de tela, ver lib/rh/salarios.ts): sem ele os valores
  // nem saem do servidor.
  const ver = acesso ? podeVerSalarios(acesso) : false;
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

  const lista = (vagas ?? []).map((v) => (ver ? v : { ...v, salario_previsto: null }));

  return <VagasBoard vagas={lista} departamentos={departamentos ?? []} candidatos={candidatos ?? []} />;
}
