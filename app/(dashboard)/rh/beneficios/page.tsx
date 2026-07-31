import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForRH } from "@/lib/rh";
import { BeneficiosBoard } from "@/components/rh/beneficios-board";
import type { Beneficio, Funcionario } from "@/lib/types";

export default async function BeneficiosPage() {
  const donoId = await getEffectiveDonoIdForRH();
  const supabase = await createClient();

  const [{ data: beneficios }, { data: funcionarios }] = donoId
    ? ((await Promise.all([
        supabase
          .from("beneficios")
          .select("*")
          .eq("user_id", donoId)
          .order("created_at", { ascending: false }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
      ])) as [{ data: Beneficio[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as Beneficio[] }, { data: [] as Funcionario[] }];

  return <BeneficiosBoard beneficios={beneficios ?? []} funcionarios={funcionarios ?? []} />;
}
