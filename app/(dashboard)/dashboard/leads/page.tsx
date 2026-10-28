import { Target, UserCheck, Percent, PieChart, Send } from "lucide-react";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { BarList } from "@/components/bar-list";
import { formatDate } from "@/lib/format";
import type { Lead } from "@/lib/types";

type LeadRow = Pick<
  Lead,
  | "id"
  | "nome"
  | "contato"
  | "status"
  | "resultado"
  | "nicho"
  | "previa_enviada"
  | "data_previa"
>;

export default async function DashboardLeadsPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceIdAtivo();

  const { data: leads } = (await supabase
    .from("leads")
    .select(
      "id, nome, contato, status, resultado, nicho, previa_enviada, data_previa"
    )
    .eq("workspace_id", workspaceId ?? "")) as { data: LeadRow[] | null };

  const leadsList = leads ?? [];
  const totalLeads = leadsList.length;
  const aAbordar = leadsList.filter((l) => l.status === "abordar").length;
  const abordados = leadsList.filter((l) => l.status === "abordado").length;
  const convertidos = leadsList.filter((l) => l.status === "convertido").length;
  const recusados = leadsList.filter((l) => l.resultado === "negou").length;
  const taxaRecusa = abordados > 0 ? recusados / abordados : null;

  const nichoCounts = new Map<string, number>();
  for (const lead of leadsList) {
    if (!lead.nicho) continue;
    nichoCounts.set(lead.nicho, (nichoCounts.get(lead.nicho) ?? 0) + 1);
  }
  const distribuicaoNicho = [...nichoCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const aguardandoResposta = leadsList
    .filter(
      (l) =>
        l.status === "abordado" && l.previa_enviada && l.resultado === null
    )
    .sort((a, b) => (a.data_previa ?? "").localeCompare(b.data_previa ?? ""));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">
          Dashboard Leads
        </h1>
        <p className="text-sm text-zinc-500">
          Visão geral da prospecção de leads
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Total de leads" value={String(totalLeads)} />
        <StatCard
          icon={UserCheck}
          label="A abordar / Abordados"
          value={`${aAbordar} / ${abordados}`}
        />
        <StatCard
          icon={Percent}
          label="Taxa de recusa"
          value={taxaRecusa !== null ? `${(taxaRecusa * 100).toFixed(1)}%` : "—"}
          hint={
            taxaRecusa !== null
              ? `${recusados} de ${abordados} abordados`
              : "Sem leads abordados ainda"
          }
        />
        <StatCard
          icon={UserCheck}
          label="Convertidos em cliente"
          value={String(convertidos)}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <PieChart className="h-4 w-4 text-zinc-500" />
          Distribuição por nicho
        </h2>
        {distribuicaoNicho.length > 0 ? (
          <BarList items={distribuicaoNicho} />
        ) : (
          <p className="text-xs text-zinc-600">Nenhum lead com nicho definido.</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Send className="h-4 w-4 text-zinc-500" />
          Aguardando resposta
        </h2>

        {aguardandoResposta.length > 0 ? (
          <div className="space-y-2">
            {aguardandoResposta.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{lead.nome}</p>
                  <p className="text-xs text-zinc-500">
                    {lead.contato ?? "Sem contato"}
                    {lead.nicho && ` · ${lead.nicho}`}
                  </p>
                </div>
                {lead.data_previa && (
                  <span className="shrink-0 text-xs text-zinc-500">
                    prévia em {formatDate(lead.data_previa)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhum lead aguardando resposta no momento.
          </p>
        )}
      </div>
    </div>
  );
}
