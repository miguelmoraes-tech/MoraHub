import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { DepartamentosBoard } from "@/components/rh/departamentos-board";
import type { Departamento, Funcionario } from "@/lib/types";

export default async function DepartamentosPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: departamentos }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("departamentos")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: Departamento[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as Departamento[] }, { data: [] as Funcionario[] }];

  return (
    <DepartamentosBoard
      departamentos={departamentos ?? []}
      funcionarios={funcionarios ?? []}
    />
  );
}
