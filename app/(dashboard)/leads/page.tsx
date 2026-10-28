import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo, temExtra } from "@/lib/empresa-ativa";
import { LeadsBoard } from "@/components/leads-board";
import { todayISO, subtractDaysISO } from "@/lib/vencimentos/dates";
import type { Lead, Proposta, FollowupLead, Campanha } from "@/lib/types";

export default async function LeadsPage() {
  const supabase = await createClient();
  // Fundador/cofundador: tudo. Sócio/funcionário: o que a permissão de leads libera.
  const acesso = await getAcessoModulo("leads");
  const workspaceId = acesso?.workspaceId ?? null;
  const ocultarContato = !acesso || !temExtra(acesso, "contato");
  // O seletor de campanha dos leads só existe para quem tem o módulo Marketing
  // (ligado na empresa e liberado para a pessoa); sem ele, a lista vem vazia.
  const acessoMarketing = await getAcessoModulo("marketing");
  const noventaDiasAtras = subtractDaysISO(todayISO(), 90);

  const [{ data: leads }, { data: propostas }, { data: followups }, { data: campanhas }] =
    (await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .order("nome"),
      supabase
        .from("propostas")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .not("lead_id", "is", null),
      supabase
        .from("followups_lead")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .order("data_contato", { ascending: false }),
      // Campanhas ativas/recentes: só com acesso ao módulo Marketing.
      acessoMarketing
        ? supabase
            .from("campanhas")
            .select("id, nome, status, canal")
            .eq("workspace_id", acessoMarketing.workspaceId)
            .or(`status.eq.ativa,created_at.gte.${noventaDiasAtras}`)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ])) as [
      { data: Lead[] | null },
      { data: Proposta[] | null },
      { data: FollowupLead[] | null },
      { data: Pick<Campanha, "id" | "nome" | "status" | "canal">[] | null },
    ];

  return (
    <LeadsBoard
      // Sem o extra "contato" o valor nem vai para a tela (só interface; não é barreira).
      leads={(leads ?? []).map((l) => (ocultarContato ? { ...l, contato: null } : l))}
      propostas={propostas ?? []}
      followups={followups ?? []}
      campanhas={campanhas ?? []}
      somenteLeitura={acesso?.nivel !== "edicao"}
      semExportar={!acesso?.ehDono}
      ocultarContato={ocultarContato}
    />
  );
}
