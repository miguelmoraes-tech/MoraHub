import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerSalarios } from "@/lib/rh/salarios";
import { BeneficiosBoard } from "@/components/rh/beneficios-board";
import type { Beneficio, Funcionario } from "@/lib/types";

export default async function BeneficiosPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  // Salários são do extra "salarios" (só de tela, ver lib/rh/salarios.ts): sem ele os valores
  // nem saem do servidor.
  const ver = acesso ? podeVerSalarios(acesso) : false;
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

  const lista = (beneficios ?? []).map((b) => (ver ? b : { ...b, valor: null }));
  // O salário do funcionário também sai de cena (a tela só usa o nome).
  const pessoas = (funcionarios ?? []).map((f) => (ver ? f : { ...f, salario: null }));

  return <BeneficiosBoard beneficios={lista} funcionarios={pessoas} />;
}
