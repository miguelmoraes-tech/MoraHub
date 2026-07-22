import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse, type ExportColumn } from "@/lib/export/xlsx";
import { formatDate } from "@/lib/format";
import type { Lead } from "@/lib/types";

const STATUS_LABEL: Record<Lead["status"], string> = {
  abordar: "A abordar",
  abordado: "Abordado",
};

const RESULTADO_LABEL: Record<NonNullable<Lead["resultado"]>, string> = {
  sem_resposta: "Sem resposta",
  negou: "Negou",
};

function simNao(value: boolean) {
  return value ? "Sim" : "Não";
}

const COLUMNS: ExportColumn<Lead>[] = [
  { header: "Nome", value: (l) => l.nome },
  { header: "Contato", value: (l) => l.contato },
  { header: "Tem site", value: (l) => simNao(l.tem_site) },
  { header: "Link do site", value: (l) => l.site_link },
  { header: "Tem Instagram", value: (l) => simNao(l.tem_insta) },
  { header: "Link do Instagram", value: (l) => l.insta_link },
  { header: "Descrição", width: 40, value: (l) => l.descricao },
  { header: "Status", value: (l) => STATUS_LABEL[l.status] },
  {
    header: "Resultado",
    value: (l) => (l.resultado ? RESULTADO_LABEL[l.resultado] : null),
  },
  { header: "Motivo da negativa", value: (l) => l.motivo_negou },
  { header: "Abordado por", value: (l) => l.abordado_por },
  { header: "Nicho", value: (l) => l.nicho },
  { header: "Prévia enviada", value: (l) => simNao(l.previa_enviada) },
  {
    header: "Data da prévia",
    value: (l) => (l.data_previa ? formatDate(l.data_previa) : null),
  },
  { header: "Criado em", value: (l) => formatDate(l.created_at.slice(0, 10)) },
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const nicho = request.nextUrl.searchParams.get("nicho");

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (nicho) query = query.eq("nicho", nicho);

  const { data: leads } = (await query) as { data: Lead[] | null };

  return buildXlsxResponse("leads", "Leads", COLUMNS, leads ?? []);
}
