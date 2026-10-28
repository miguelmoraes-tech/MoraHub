import type { NextRequest } from "next/server";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse, type ExportColumn } from "@/lib/export/xlsx";
import { computeDre } from "@/lib/dre/compute";
import { filtrarContasPorPapel, getContasVinculadas } from "@/lib/colaborador";
import type { Comprovante, Gasto } from "@/lib/types";

type DreRow = { label: string; valor: number };

const COLUMNS: ExportColumn<DreRow>[] = [
  { header: "Item", width: 32, value: (r) => r.label },
  { header: "Valor", value: (r) => r.valor },
];

async function resolveDonoId(donoIdParam: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!donoIdParam) return getDonoIdAtivo();
  if (donoIdParam === user.id) return user.id;

  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  return contas.some((c) => c.dono_id === donoIdParam) ? donoIdParam : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado.", { status: 401 });

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!start || !end) return new Response("Período inválido.", { status: 400 });

  const donoId = await resolveDonoId(request.nextUrl.searchParams.get("donoId"));
  if (!donoId) return new Response("Conta inválida.", { status: 403 });

  const [{ data: gastos }, { data: comprovantes }] = await Promise.all([
    supabase.from("gastos").select("*").eq("user_id", donoId).gte("data", start).lte("data", end),
    supabase
      .from("comprovantes")
      .select("*")
      .eq("user_id", donoId)
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
