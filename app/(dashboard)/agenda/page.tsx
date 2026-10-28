import { redirect } from "next/navigation";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { getColaboradoresDaEmpresa } from "@/lib/colaboradores";
import { AgendaView } from "@/components/agenda/agenda-view";
import type { ReuniaoComLead } from "@/lib/agenda-shared";
import type { ColaboradorVinculado, Reuniao } from "@/lib/types";

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceIdAtivo();

  const [{ data: reunioes }, { data: colaboradores }] = (await Promise.all([
    supabase
      .from("reunioes")
      .select("*")
      .eq("workspace_id", workspaceId ?? "")
      .order("data_hora", { ascending: true }),
    getColaboradoresDaEmpresa(supabase, workspaceId).then((data) => ({ data })),
  ])) as [
    { data: Reuniao[] | null },
    { data: ColaboradorVinculado[] | null },
  ];
  const itens = reunioes ?? [];

  const leadIds = [...new Set(itens.map((r) => r.lead_id))];
  const { data: leads } = leadIds.length
    ? ((await supabase
        .from("leads")
        .select("id, nome")
        .eq("workspace_id", workspaceId ?? "")
        .in("id", leadIds)) as {
        data: { id: string; nome: string }[] | null;
      })
    : { data: [] };
  const leadNome = new Map((leads ?? []).map((l) => [l.id, l.nome]));

  // Includes vendedores whose access was removed, so their past meetings
  // keep a name and stay filterable.
  const vendedores = (colaboradores ?? [])
    .filter((c) => c.papel === "comercial")
    .map((c) => ({ id: c.membro_id, nome: c.nome || c.email || "Vendedor" }));
  const vendedorNome = new Map(vendedores.map((v) => [v.id, v.nome]));

  const agenda: ReuniaoComLead[] = itens.map((r) => ({
    ...r,
    lead_nome: leadNome.get(r.lead_id) ?? "Lead removido",
    vendedor_nome: r.vendedor_id ? (vendedorNome.get(r.vendedor_id) ?? null) : null,
  }));

  return <AgendaView reunioes={agenda} mode="dono" vendedores={vendedores} />;
}
