import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import { buildXlsxResponse, type ExportColumn } from "@/lib/export/xlsx";
import { formatDate } from "@/lib/format";
import type { Renegado } from "@/lib/types";

function simNao(value: boolean) {
  return value ? "Sim" : "Não";
}

const COLUMNS: ExportColumn<Renegado>[] = [
  { header: "Nome", value: (r) => r.nome },
  { header: "Contato", value: (r) => r.contato },
  { header: "Tem site", value: (r) => simNao(r.tem_site) },
  { header: "Link do site", value: (r) => r.site_link },
  { header: "Tem Instagram", value: (r) => simNao(r.tem_insta) },
  { header: "Link do Instagram", value: (r) => r.insta_link },
  { header: "Descrição", width: 40, value: (r) => r.descricao },
  { header: "Abordado por", value: (r) => r.abordado_por },
  { header: "Motivo da negativa", value: (r) => r.motivo_negou },
  {
    header: "Data da abordagem",
    value: (r) => (r.data_abordagem ? formatDate(r.data_abordagem) : null),
  },
  { header: "Nicho", value: (r) => r.nicho },
  { header: "Criado em", value: (r) => formatDate(r.created_at.slice(0, 10)) },
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
  const workspaceId = await getWorkspaceIdPadrao(user.id, "empresarial");

  let query = supabase
    .from("renegados")
    .select("*")
    .eq("workspace_id", workspaceId ?? "")
    .order("nome");
  if (nicho) query = query.eq("nicho", nicho);

  const { data: renegados } = (await query) as { data: Renegado[] | null };

  return buildXlsxResponse("renegados", "Renegados", COLUMNS, renegados ?? []);
}
