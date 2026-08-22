import { todayISO } from "@/lib/vencimentos/dates";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type FuncionarioAtivoRow = { id: string; nome: string; salario: number | null };
type FolhaExistenteRow = { funcionario_id: string };

function diasNoMes(ano: number, mesIndex0: number) {
  return new Date(Date.UTC(ano, mesIndex0 + 1, 0)).getUTCDate();
}

/** Due date for a payroll generated for `mesReferenciaISO` (first day of the
 * reference month): day `diaVencimento` of the following month. */
function calcularVencimento(mesReferenciaISO: string, diaVencimento: number): string {
  const [ano, mes] = mesReferenciaISO.split("-").map(Number);
  const proximoMesIndex0 = mes; // mes is 1-based, so `mes` itself is next month's 0-based index
  const anoVencimento = ano + Math.floor(proximoMesIndex0 / 12);
  const mesVencimento0 = proximoMesIndex0 % 12;
  const dia = Math.min(diaVencimento, diasNoMes(anoVencimento, mesVencimento0));
  return `${anoVencimento}-${String(mesVencimento0 + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function mesLabel(mesReferenciaISO: string) {
  const [ano, mes] = mesReferenciaISO.split("-");
  return `${mes}/${ano}`;
}

export async function gerarFolhaDoMes(
  supabase: SupabaseClient,
  donoId: string,
  mesReferenciaISO: string,
  diaVencimento: number
): Promise<{ criados: number; jaExistentes: number }> {
  const [{ data: funcionarios }, { data: folhasExistentes }] = (await Promise.all([
    supabase
      .from("funcionarios")
      .select("id, nome, salario")
      .eq("user_id", donoId)
      .eq("status", "ativo"),
    supabase
      .from("folha_pagamento")
      .select("funcionario_id")
      .eq("user_id", donoId)
      .eq("mes_referencia", mesReferenciaISO),
  ])) as [{ data: FuncionarioAtivoRow[] | null }, { data: FolhaExistenteRow[] | null }];

  const jaTemFolha = new Set((folhasExistentes ?? []).map((f) => f.funcionario_id));
  const pendentes = (funcionarios ?? []).filter((f) => !jaTemFolha.has(f.id));
  const vencimento = calcularVencimento(mesReferenciaISO, diaVencimento);
  const mes = mesLabel(mesReferenciaISO);
  const workspaceId = await getWorkspaceIdPadrao(donoId, "empresarial");

  let criados = 0;
  for (const funcionario of pendentes) {
    const salarioBruto = funcionario.salario ?? 0;

    const { data: contaPagar, error: contaPagarError } = await supabase
      .from("contas_pagar")
      .insert({
        user_id: donoId,
        workspace_id: workspaceId,
        descricao: `Folha de pagamento — ${funcionario.nome} — ${mes}`,
        valor: salarioBruto,
        categoria: "Folha de pagamento",
        data_vencimento: vencimento,
        status: "pendente",
      })
      .select("id")
      .single();
    if (contaPagarError || !contaPagar) continue;

    const { error: folhaError } = await supabase.from("folha_pagamento").insert({
      user_id: donoId,
      funcionario_id: funcionario.id,
      mes_referencia: mesReferenciaISO,
      salario_bruto: salarioBruto,
      descontos: 0,
      salario_liquido: salarioBruto,
      status: "pendente",
      conta_pagar_id: (contaPagar as { id: string }).id,
    });
    if (folhaError) {
      await supabase.from("contas_pagar").delete().eq("id", (contaPagar as { id: string }).id);
      continue;
    }

    criados += 1;
  }

  return { criados, jaExistentes: jaTemFolha.size };
}

/** Pushes a folha_pagamento status change into its linked contas_pagar row, if any. */
export async function syncContaPagarFromFolha(
  supabase: SupabaseClient,
  contaPagarId: string | null,
  status: "pendente" | "pago",
  dataPagamento: string | null
) {
  if (!contaPagarId) return;
  await supabase
    .from("contas_pagar")
    .update({
      status,
      data_pagamento: status === "pago" ? (dataPagamento ?? todayISO()) : null,
    })
    .eq("id", contaPagarId);
}

/** Pushes a contas_pagar status change into any folha_pagamento row linked to it. */
export async function syncFolhaFromContaPagar(
  supabase: SupabaseClient,
  contaPagarId: string,
  contaPagarStatus: "pendente" | "pago" | "atrasado",
  dataPagamento: string | null
) {
  const folhaStatus = contaPagarStatus === "pago" ? "pago" : "pendente";
  await supabase
    .from("folha_pagamento")
    .update({
      status: folhaStatus,
      data_pagamento: folhaStatus === "pago" ? (dataPagamento ?? todayISO()) : null,
    })
    .eq("conta_pagar_id", contaPagarId);
}
