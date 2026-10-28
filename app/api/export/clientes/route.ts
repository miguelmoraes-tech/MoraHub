import type { NextRequest } from "next/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse, type ExportColumn } from "@/lib/export/xlsx";
import { formatDate } from "@/lib/format";
import type { Cliente, ClienteStatus } from "@/lib/types";

const STATUS_LABEL: Record<ClienteStatus, string> = {
  ativo: "Ativo",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

const COLUMNS: ExportColumn<Cliente>[] = [
  { header: "Nome", value: (c) => c.nome },
  { header: "Telefone", value: (c) => c.telefone ?? c.contato },
  { header: "E-mail", value: (c) => c.email },
  { header: "Status", value: (c) => STATUS_LABEL[c.status] },
  { header: "Segmento", value: (c) => c.segmento },
  { header: "Site", value: (c) => c.site_link },
  { header: "Observações", width: 40, value: (c) => c.resumo },
  { header: "Abordado por", value: (c) => c.abordado_por },
  { header: "Criado em", value: (c) => formatDate(c.created_at.slice(0, 10)) },
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const segmento = request.nextUrl.searchParams.get("segmento");
  const workspaceId = await getWorkspaceIdAtivo();

  let query = supabase
    .from("clientes")
    .select("*")
    .eq("workspace_id", workspaceId ?? "")
    .order("nome");
  if (segmento) query = query.eq("segmento", segmento);

  const { data: clientes } = (await query) as { data: Cliente[] | null };

  return buildXlsxResponse("clientes", "Clientes", COLUMNS, clientes ?? []);
}
