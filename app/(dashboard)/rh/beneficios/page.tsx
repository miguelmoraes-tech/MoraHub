import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { BeneficiosBoard } from "@/components/rh/beneficios-board";
import type { Beneficio, Funcionario } from "@/lib/types";

export default async function BeneficiosPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  const supabase = await createClient();

  const [{ data: beneficios }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("beneficios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: Beneficio[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as Beneficio[] }, { data: [] as Funcionario[] }];

  return <BeneficiosBoard beneficios={beneficios ?? []} funcionarios={funcionarios ?? []} />;
}
