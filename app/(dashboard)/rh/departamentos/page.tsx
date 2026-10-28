import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { DepartamentosBoard } from "@/components/rh/departamentos-board";
import type { Departamento, Funcionario } from "@/lib/types";

export default async function DepartamentosPage() {
  const donoId = await getDonoIdAtivo();
  const supabase = await createClient();

  const [{ data: departamentos }, { data: funcionarios }] = donoId
    ? ((await Promise.all([
        supabase
          .from("departamentos")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
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
