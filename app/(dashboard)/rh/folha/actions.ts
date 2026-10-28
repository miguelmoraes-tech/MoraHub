"use server";

import { revalidatePath } from "next/cache";
import { getAcessoSoDono } from "@/lib/empresa-ativa";
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
const AVISO_ATIVE_FINANCEIRO = "Ative o módulo Financeiro para gerar folha.";

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

  // RH é só do fundador/cofundador.
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return { error: SEM_PERMISSAO };
  // A folha vira contas a pagar: sem o Financeiro ligado não se grava nada às cegas.
  if (!(await getModulosHabilitados(acesso.workspaceId)).includes("financeiro")) {
    return { error: AVISO_ATIVE_FINANCEIRO };
  }

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

  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

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
  const acesso = await getAcessoSoDono("rh");
  if (!acesso) return;

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
