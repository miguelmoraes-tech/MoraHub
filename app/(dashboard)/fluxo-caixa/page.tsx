import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { todayISO } from "@/lib/vencimentos/dates";
import { FluxoCaixaView, type FluxoCaixaMes } from "@/components/fluxo-caixa-view";
import type { ContaPagar, ContaReceber } from "@/lib/types";

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
  const supabase = await createClient();

  const [{ data: contasPagar }, { data: contasReceber }] = donoId
    ? await Promise.all([
        supabase.from("contas_pagar").select("*").eq("user_id", donoId).neq("status", "pago"),
        supabase
          .from("contas_receber")
          .select("*")
          .eq("user_id", donoId)
          .neq("status", "recebido"),
      ])
    : [{ data: [] }, { data: [] }];

  const hoje = todayISO();
  const [anoAtual, mesAtual] = hoje.slice(0, 7).split("-").map(Number);
  const mesAtualIndex0 = mesAtual - 1;
  const chaveMesAtual = `${anoAtual}-${pad(mesAtual)}`;

  const buckets = new Map<
    string,
    { label: string; totalPagar: number; totalReceber: number }
  >();
  for (let i = 0; i < JANELA_MESES; i++) {
    const mIndex = mesAtualIndex0 + i;
    const ano = anoAtual + Math.floor(mIndex / 12);
    const mes = (mIndex % 12) + 1;
    const chave = `${ano}-${pad(mes)}`;
    buckets.set(chave, {
      label: `${MESES[mes - 1]}/${ano}`,
      totalPagar: 0,
      totalReceber: 0,
    });
  }

  /** Overdue-and-unsettled items collapse into the current month's bucket. */
  function bucketChave(dataVencimento: string) {
    const chave = dataVencimento.slice(0, 7);
    if (chave < chaveMesAtual) return chaveMesAtual;
    return buckets.has(chave) ? chave : null;
  }

  for (const conta of (contasPagar ?? []) as ContaPagar[]) {
    const chave = bucketChave(conta.data_vencimento);
    if (!chave) continue;
    const bucket = buckets.get(chave)!;
    bucket.totalPagar += conta.valor;
  }

  for (const conta of (contasReceber ?? []) as ContaReceber[]) {
    const chave = bucketChave(conta.data_vencimento);
    if (!chave) continue;
    const bucket = buckets.get(chave)!;
    bucket.totalReceber += conta.valor;
  }

  let saldoAcumulado = 0;
  const meses: FluxoCaixaMes[] = [...buckets.values()].map((bucket) => {
    const saldoMes = bucket.totalReceber - bucket.totalPagar;
    saldoAcumulado += saldoMes;
    return {
      label: bucket.label,
      totalPagar: bucket.totalPagar,
      totalReceber: bucket.totalReceber,
      saldoMes,
      saldoAcumulado,
    };
  });

  return <FluxoCaixaView meses={meses} />;
}
