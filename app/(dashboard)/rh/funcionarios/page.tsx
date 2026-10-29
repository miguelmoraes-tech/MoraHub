import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerSalarios } from "@/lib/rh/salarios";
import { FuncionariosBoard } from "@/components/rh/funcionarios-board";
import type { Departamento, Funcionario } from "@/lib/types";

export default async function FuncionariosPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  // Salários são do extra "salarios" (só de tela, ver lib/rh/salarios.ts): sem ele os valores
  // nem saem do servidor.
  const ver = acesso ? podeVerSalarios(acesso) : false;
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

  const lista = (funcionarios ?? []).map((f) => (ver ? f : { ...f, salario: null }));

  return <FuncionariosBoard funcionarios={lista} departamentos={departamentos ?? []} />;
}
