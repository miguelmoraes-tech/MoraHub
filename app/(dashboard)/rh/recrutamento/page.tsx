import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { VagasBoard } from "@/components/rh/vagas-board";
import type { Candidato, Departamento, Vaga } from "@/lib/types";

export default async function RecrutamentoPage() {
  const donoId = await getEffectiveDonoId();
  const supabase = await createClient();

  const [{ data: vagas }, { data: departamentos }, { data: candidatos }] = donoId
    ? ((await Promise.all([
        supabase
          .from("vagas")
          .select("*")
          .eq("user_id", donoId)
          .order("created_at", { ascending: false }),
        supabase
          .from("departamentos")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
        supabase.from("candidatos").select("*").eq("user_id", donoId),
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
