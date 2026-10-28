import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro } from "@/lib/financeiro/acesso";
import { buildXlsxResponse, type ExportColumn } from "@/lib/export/xlsx";
import { computeDre } from "@/lib/dre/compute";
import type { Comprovante, Gasto } from "@/lib/types";

type DreRow = { label: string; valor: number };

const COLUMNS: ExportColumn<DreRow>[] = [
  { header: "Item", width: 32, value: (r) => r.label },
  { header: "Valor", value: (r) => r.valor },
];

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado.", { status: 401 });

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!start || !end || !DATA_ISO.test(start) || !DATA_ISO.test(end)) {
    return new Response("Período inválido.", { status: 400 });
  }

  // A empresa é a ativa, validada no servidor (nunca vem da URL). A exportação
  // é só de valores: exige o Financeiro ligado, liberado e o extra "valores".
  const fin = await getAcessoFinanceiro();
  if (!fin || !fin.valores) return new Response("Sem permissão.", { status: 403 });

  const [{ data: gastos }, { data: comprovantes }] = await Promise.all([
    supabase
      .from("gastos")
      .select("*")
      .eq("workspace_id", fin.workspaceId)
      .gte("data", start)
      .lte("data", end),
    supabase
      .from("comprovantes")
      .select("*")
      .eq("workspace_id", fin.workspaceId)
      .gte("data", start)
      .lte("data", end),
  ]);

  const dre = computeDre((gastos ?? []) as Gasto[], (comprovantes ?? []) as Comprovante[]);

  const rows: DreRow[] = [
    { label: "Receita", valor: dre.receita },
    ...dre.despesas.map((d) => ({ label: `Despesa - ${d.categoria}`, valor: d.valor })),
    { label: "Total de despesas", valor: dre.totalDespesas },
    { label: "Resultado do período", valor: dre.resultado },
    { label: "Margem (%)", valor: dre.margem ?? 0 },
  ];

  return buildXlsxResponse("dre", "DRE", COLUMNS, rows);
}
