"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao, type AcessoModulo } from "@/lib/empresa-ativa";
import { getAcessoFinanceiroEdicao } from "@/lib/financeiro/acesso";
import { motivoNegarFolha } from "@/lib/rh/salarios";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { createClient } from "@/lib/supabase/server";
import {
  gerarFolhaDoMes,
  syncContaPagarFromFolha,
} from "@/lib/rh/folha-sync";
import { FolhaPagamentoSchema } from "@/lib/validations/folha-pagamento";
import type { ActionState } from "@/lib/actions/types";
import type { FolhaPagamentoStatus } from "@/lib/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

/**
 * A folha escreve em contas_pagar: exige edição no RH (com o extra de salários)
 * E edição no Financeiro, com o módulo ligado. Se faltar um, nada é gravado.
 */
async function acessoFolha(
  tocaContasPagar: boolean
): Promise<{ erro: string } | { acesso: AcessoModulo }> {
  const rh = await getAcessoEdicao("rh");
  if (!rh) return { erro: SEM_PERMISSAO };
  const financeiroLigado = (await getModulosHabilitados(rh.workspaceId)).includes("financeiro");
  const financeiroEdicao = financeiroLigado ? await getAcessoFinanceiroEdicao() : null;
  const erro = motivoNegarFolha({ rh, financeiroLigado, financeiroEdicao, tocaContasPagar });
  return erro ? { erro } : { acesso: rh };
}

function revalidateFolha() {
  revalidatePath("/rh/folha");
  revalidatePath("/rh");
  revalidatePath("/contas-pagar");
  revalidatePath("/dashboard/financeiro");
}

export async function gerarFolhaMes(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const mesReferencia = textOrNull(formData.get("mes_referencia"));
  if (!mesReferencia) return { error: "Informe o mês de referência." };

  const diaVencimentoRaw = textOrNull(formData.get("dia_vencimento"));
  const diaVencimento = diaVencimentoRaw ? Number(diaVencimentoRaw) : 5;
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
    return { error: "Informe um dia de vencimento válido (1 a 28)." };
  }

  const guarda = await acessoFolha(true);
  if ("erro" in guarda) return { error: guarda.erro };
  const acesso = guarda.acesso;

  const supabase = await createClient();
  const mesReferenciaISO = `${mesReferencia}-01`;
  const { criados } = await gerarFolhaDoMes(
    supabase,
    { workspaceId: acesso.workspaceId, donoId: acesso.donoId },
    mesReferenciaISO,
    diaVencimento
  );

  revalidateFolha();
  if (criados === 0) {
    return { error: "Nenhum funcionário novo: a folha deste mês já foi gerada para todos os ativos." };
  }
  return { ok: true };
}

function parseForm(formData: FormData) {
  return FolhaPagamentoSchema.safeParse({
    salario_bruto: formData.get("salario_bruto"),
    descontos: textOrNull(formData.get("descontos")) ?? undefined,
    salario_liquido: formData.get("salario_liquido"),
    status: formData.get("status") ?? "pendente",
    data_pagamento: textOrNull(formData.get("data_pagamento")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function updateFolhaPagamento(
  folhaId: string,
  contaPagarId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const guarda = await acessoFolha(contaPagarId != null);
  if ("erro" in guarda) return { error: guarda.erro };
  const acesso = guarda.acesso;

  const supabase = await createClient();
  const status: FolhaPagamentoStatus = parsed.data.status;
  const dataPagamento = status === "pago" ? (parsed.data.data_pagamento ?? null) : null;

  const { error } = await supabase
    .from("folha_pagamento")
    .update({
      salario_bruto: parsed.data.salario_bruto,
      descontos: parsed.data.descontos ?? 0,
      salario_liquido: parsed.data.salario_liquido,
      status,
      data_pagamento: dataPagamento,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", folhaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar a folha." };

  await syncContaPagarFromFolha(supabase, acesso.workspaceId, contaPagarId, status, dataPagamento);

  revalidateFolha();
  return { ok: true };
}

export async function deleteFolhaPagamento(folhaId: string, contaPagarId: string | null) {
  const guarda = await acessoFolha(contaPagarId != null);
  if ("erro" in guarda) return;
  const acesso = guarda.acesso;

  const supabase = await createClient();
  await supabase
    .from("folha_pagamento")
    .delete()
    .eq("id", folhaId)
    .eq("workspace_id", acesso.workspaceId);
  if (contaPagarId) {
    await supabase
      .from("contas_pagar")
      .delete()
      .eq("id", contaPagarId)
      .eq("workspace_id", acesso.workspaceId);
  }
  revalidateFolha();
}
