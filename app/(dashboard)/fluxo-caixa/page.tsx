import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId, getEffectiveWorkspaceId } from "@/lib/financeiro";
import { todayISO, recurringMonthKeysInWindow } from "@/lib/vencimentos/dates";
import { FluxoCaixaView, type FluxoCaixaMes } from "@/components/fluxo-caixa-view";
import type { Assinatura, ContaPagar, ContaReceber, Gasto } from "@/lib/types";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const JANELA_MESES = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function FluxoCaixaPage() {
  const donoId = await getEffectiveDonoId();
  const workspaceId = await getEffectiveWorkspaceId();
  const supabase = await createClient();

  const [
    { data: contasPagar },
    { data: contasReceber },
    { data: assinaturas },
    { data: gastosFixos },
  ] = donoId
    ? await Promise.all([
        supabase
          .from("contas_pagar")
          .select("valor, data_vencimento")
          .eq("workspace_id", workspaceId ?? ""),
        supabase
          .from("contas_receber")
          .select("valor, data_vencimento")
          .eq("workspace_id", workspaceId ?? "")
          .in("status", ["pendente", "recebido"]),
        supabase
          .from("assinaturas")
          .select("valor, recorrencia, proxima_cobranca")
          .eq("workspace_id", workspaceId ?? "")
          .eq("status", "ativa"),
        supabase
          .from("gastos")
          .select("valor, recorrencia, data")
          .eq("workspace_id", workspaceId ?? "")
          .eq("tipo", "fixo"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const hoje = todayISO();
  const [anoAtual, mesAtual] = hoje.slice(0, 7).split("-").map(Number);
  const mesAtualIndex0 = mesAtual - 1;

  const monthKeys: string[] = [];
  const buckets = new Map<
    string,
    {
      label: string;
      contasReceber: number;
      assinaturas: number;
      contasPagar: number;
      gastosFixos: number;
    }
  >();
  for (let i = 0; i < JANELA_MESES; i++) {
    const mIndex = mesAtualIndex0 + i;
    const ano = anoAtual + Math.floor(mIndex / 12);
    const mes = (mIndex % 12) + 1;
    const chave = `${ano}-${pad(mes)}`;
    monthKeys.push(chave);
    buckets.set(chave, {
      label: `${MESES[mes - 1]}/${ano}`,
      contasReceber: 0,
      assinaturas: 0,
      contasPagar: 0,
      gastosFixos: 0,
    });
  }

  for (const conta of (contasPagar ?? []) as Pick<
    ContaPagar,
    "valor" | "data_vencimento"
  >[]) {
    const bucket = buckets.get(conta.data_vencimento.slice(0, 7));
    if (bucket) bucket.contasPagar += conta.valor;
  }

  for (const conta of (contasReceber ?? []) as Pick<
    ContaReceber,
    "valor" | "data_vencimento"
  >[]) {
    const bucket = buckets.get(conta.data_vencimento.slice(0, 7));
    if (bucket) bucket.contasReceber += conta.valor;
  }

  for (const assinatura of (assinaturas ?? []) as Pick<
    Assinatura,
    "valor" | "recorrencia" | "proxima_cobranca"
  >[]) {
    const chaves = recurringMonthKeysInWindow(
      assinatura.proxima_cobranca,
      assinatura.recorrencia,
      monthKeys
    );
    for (const chave of chaves) {
      buckets.get(chave)!.assinaturas += assinatura.valor ?? 0;
    }
  }

  for (const gasto of (gastosFixos ?? []) as Pick<
    Gasto,
    "valor" | "recorrencia" | "data"
  >[]) {
    const chaves = recurringMonthKeysInWindow(
      gasto.data,
      gasto.recorrencia,
      monthKeys
    );
    for (const chave of chaves) {
      buckets.get(chave)!.gastosFixos += gasto.valor;
    }
  }

  let saldoAcumulado = 0;
  const meses: FluxoCaixaMes[] = monthKeys.map((chave) => {
    const bucket = buckets.get(chave)!;
    const totalEntradas = bucket.contasReceber + bucket.assinaturas;
    const totalSaidas = bucket.contasPagar + bucket.gastosFixos;
    const saldoMes = totalEntradas - totalSaidas;
    saldoAcumulado += saldoMes;
    return {
      label: bucket.label,
      contasReceber: bucket.contasReceber,
      assinaturas: bucket.assinaturas,
      contasPagar: bucket.contasPagar,
      gastosFixos: bucket.gastosFixos,
      totalEntradas,
      totalSaidas,
      saldoMes,
      saldoAcumulado,
    };
  });

  return <FluxoCaixaView meses={meses} />;
}
