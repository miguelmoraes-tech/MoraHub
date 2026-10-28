import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { FuncionariosBoard } from "@/components/rh/funcionarios-board";
import type { Departamento, Funcionario } from "@/lib/types";

export default async function FuncionariosPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: funcionarios }, { data: departamentos }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
        supabase
          .from("departamentos")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: Funcionario[] | null }, { data: Departamento[] | null }])
    : [{ data: [] as Funcionario[] }, { data: [] as Departamento[] }];

  return (
    <FuncionariosBoard
      funcionarios={funcionarios ?? []}
      departamentos={departamentos ?? []}
    />
  );
}
