import { Target, UserX, Users, CalendarClock, UserCheck, Activity } from "lucide-react";
import { SetorResumoCard } from "@/components/dashboard-executivo/setor-resumo-card";
import type { DashboardHomeOverview } from "@/lib/dashboard-home/get-overview";

export function DashboardHomeBoard({ overview }: { overview: DashboardHomeOverview }) {
  const { leads, renegados, clientes, agenda, vendedores, atividade } = overview;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Visão Geral</h1>
        <p className="text-sm text-zinc-500">
          Atalhos e resumo dos módulos ativos: leads, renegados, clientes, agenda e vendedores
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SetorResumoCard
          icon={Target}
          titulo="Leads"
          href="/leads"
          stats={[
            {
              label: "a abordar",
              value: String(leads.aAbordar),
              tone: leads.aAbordar > 0 ? "copper" : "zinc",
            },
            { label: "abordados", value: String(leads.abordados) },
            {
              label: "follow-ups pendentes",
              value: String(leads.followupsPendentes),
              tone: leads.followupsPendentes > 0 ? "amber" : "emerald",
            },
          ]}
        />

        <SetorResumoCard
          icon={UserX}
          titulo="Renegados"
          href="/renegados"
          stats={[{ label: "cadastrados", value: String(renegados.total) }]}
        />

        <SetorResumoCard
          icon={Users}
          titulo="Clientes"
          href="/clientes"
          stats={[
            { label: "ativos", value: String(clientes.ativos), tone: "emerald" },
            { label: "no total", value: String(clientes.total) },
            { label: "leads convertidos", value: String(leads.convertidos) },
          ]}
        />

        <SetorResumoCard
          icon={CalendarClock}
          titulo="Agenda"
          href="/agenda"
          stats={[
            {
              label: "reuniões hoje",
              value: String(agenda.hoje),
              tone: agenda.hoje > 0 ? "copper" : "zinc",
            },
            { label: "próximos 7 dias", value: String(agenda.proximos7Dias) },
          ]}
        />

        <SetorResumoCard
          icon={UserCheck}
          titulo="Vendedores"
          href="/vendedores"
          stats={[
            { label: "ativos", value: String(vendedores.ativos) },
            {
              label: "solicitações pendentes",
              value: String(vendedores.solicitacoesPendentes),
              tone: vendedores.solicitacoesPendentes > 0 ? "amber" : "zinc",
            },
          ]}
        />

        <SetorResumoCard
          icon={Activity}
          titulo="Atividade dos vendedores (7 dias)"
          href="/atividade-vendedores"
          stats={[
            { label: "vendedores ativos", value: String(atividade.vendedoresAtivos) },
            { label: "leads abertos", value: String(atividade.leadsAbertos) },
            { label: "aberturas", value: String(atividade.aberturas) },
          ]}
        />
      </div>
    </div>
  );
}
