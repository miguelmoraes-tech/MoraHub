import { createClient } from "@/lib/supabase/server";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { FolhaPagamentoBoard } from "@/components/rh/folha-pagamento-board";
import type { FolhaPagamento, Funcionario } from "@/lib/types";

export default async function FolhaPagamentoPage() {
  // RH é só do fundador/cofundador: sócio e funcionário nunca chegam aqui.
  const acesso = await getAcessoSoDono("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  // RH exige o Financeiro (a folha gera contas a pagar).
  const financeiroAtivo = workspaceId
    ? (await getModulosHabilitados(workspaceId)).includes("financeiro")
    : false;
  const supabase = await createClient();

  const [{ data: folhas }, { data: funcionarios }] = workspaceId
    ? ((await Promise.all([
        supabase
          .from("folha_pagamento")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("mes_referencia", { ascending: false }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("nome", { ascending: true }),
      ])) as [{ data: FolhaPagamento[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as FolhaPagamento[] }, { data: [] as Funcionario[] }];

  return (
    <FolhaPagamentoBoard
      folhas={folhas ?? []}
      funcionarios={funcionarios ?? []}
      financeiroAtivo={financeiroAtivo}
    />
  );
}
