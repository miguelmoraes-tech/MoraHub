import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { FuncionariosBoard } from "@/components/rh/funcionarios-board";
import type { Departamento, Funcionario } from "@/lib/types";

export default async function FuncionariosPage() {
  const donoId = await getEffectiveDonoId();
  const supabase = await createClient();

  const [{ data: funcionarios }, { data: departamentos }] = donoId
    ? ((await Promise.all([
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
        supabase
          .from("departamentos")
          .select("*")
          .eq("user_id", donoId)
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
