import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForRH } from "@/lib/rh";
import { FeriasBoard } from "@/components/rh/ferias-board";
import type { Feria, Funcionario } from "@/lib/types";

export default async function FeriasPage() {
  const donoId = await getEffectiveDonoIdForRH();
  const supabase = await createClient();

  const [{ data: ferias }, { data: funcionarios }] = donoId
    ? ((await Promise.all([
        supabase
          .from("ferias")
          .select("*")
          .eq("user_id", donoId)
          .order("periodo_aquisitivo_fim", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
      ])) as [{ data: Feria[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as Feria[] }, { data: [] as Funcionario[] }];

  return <FeriasBoard ferias={ferias ?? []} funcionarios={funcionarios ?? []} />;
}
