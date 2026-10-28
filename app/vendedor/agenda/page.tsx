import { createClient } from "@/lib/supabase/server";
import { requireVendedor } from "@/lib/vendedor";
import { AgendaView } from "@/components/agenda/agenda-view";
import type { ReuniaoComLead } from "@/lib/agenda-shared";
import type { Reuniao } from "@/lib/types";

export default async function VendedorAgendaPage() {
  const { workspaceId, email } = await requireVendedor();
  const supabase = await createClient();

  // RLS ("vendedor le suas reunioes") already restricts this to the caller's
  // own meetings; the workspace filter just keeps a multi-company vendedor
  // on the company they picked.
  const { data } = (await supabase
    .from("reunioes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("data_hora", { ascending: true })) as { data: Reuniao[] | null };
  const reunioes = data ?? [];

  const leadIds = [...new Set(reunioes.map((r) => r.lead_id))];
  const { data: leads } = leadIds.length
    ? ((await supabase
        .from("leads")
        .select("id, nome")
        .eq("workspace_id", workspaceId)
        .in("id", leadIds)) as {
        data: { id: string; nome: string }[] | null;
      })
    : { data: [] };
  const leadNome = new Map((leads ?? []).map((l) => [l.id, l.nome]));

  const itens: ReuniaoComLead[] = reunioes.map((r) => ({
    ...r,
    lead_nome: leadNome.get(r.lead_id) ?? "Lead removido",
    vendedor_nome: email,
  }));

  return <AgendaView reunioes={itens} mode="vendedor" />;
}
