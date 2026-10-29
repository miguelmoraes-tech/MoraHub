import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { motivoNegarFolha, podeVerSalarios } from "@/lib/rh/salarios";
import { FolhaPagamentoBoard } from "@/components/rh/folha-pagamento-board";
import type { FolhaPagamento, Funcionario } from "@/lib/types";

export default async function FolhaPagamentoPage() {
  // RH por pessoa: fundador/cofundador ou quem tem permissão de leitura (o proxy já barra o resto).
  const acesso = await getAcessoModulo("rh");
  const workspaceId = acesso?.workspaceId ?? null;
  // Folha é toda dinheiro: sem o extra "salarios" (só de tela) nada dela sai do servidor.
  if (acesso && !podeVerSalarios(acesso)) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-lg font-semibold text-zinc-100">Folha de Pagamento</h1>
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-sm text-zinc-400">
          Você não tem a permissão “Ver salários e folha”. Peça a um fundador para liberá-la.
        </p>
      </div>
    );
  }
  // A folha gera contas a pagar: exige edição no RH e no Financeiro (ligado).
  const financeiroLigado = workspaceId
    ? (await getModulosHabilitados(workspaceId)).includes("financeiro")
    : false;
  const financeiroEdicao = financeiroLigado ? await getAcessoFinanceiroEdicao() : null;
  const avisoGerar = acesso
    ? acesso.nivel !== "edicao"
      ? "Você tem acesso de leitura ao RH: não é possível gerar folha."
      : motivoNegarFolha({ rh: acesso, financeiroLigado, financeiroEdicao, tocaContasPagar: true })
    : null;
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
      avisoGerar={avisoGerar}
    />
  );
}
