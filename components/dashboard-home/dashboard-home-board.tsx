import Link from "next/link";
import { Target, UserX, Users, CalendarClock, UserCheck, Activity, Blocks } from "lucide-react";
import { SetorResumoCard } from "@/components/dashboard-executivo/setor-resumo-card";
import type { DashboardHomeOverview } from "@/lib/dashboard-home/get-overview";

export function DashboardHomeBoard({ overview }: { overview: DashboardHomeOverview }) {
  const { leads, renegados, clientes, agenda, vendedores, atividade, habilitados } = overview;
  const com = (chave: string) => habilitados.includes(chave);
  const temResumo = ["leads", "renegados", "clientes", "agenda", "vendedores"].some(com);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Visão Geral</h1>
        <p className="text-sm text-zinc-500">
          Atalhos e resumo dos módulos que a sua empresa usa
        </p>
      </div>

      {!temResumo && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
            <Blocks className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-100">Nenhum módulo ligado</p>
            <p className="text-sm text-zinc-500">
              Escolha os módulos que a empresa vai usar. Dá para ligar e desligar quando quiser.
            </p>
          </div>
          <Link
            href="/modulos"
            className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
          >
            Escolher módulos
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {com("leads") && (
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
        )}

        {com("renegados") && (
          <SetorResumoCard
            icon={UserX}
            titulo="Renegados"
            href="/renegados"
            stats={[{ label: "cadastrados", value: String(renegados.total) }]}
          />
        )}

        {com("clientes") && (
          <SetorResumoCard
            icon={Users}
            titulo="Clientes"
            href="/clientes"
            stats={[
              { label: "ativos", value: String(clientes.ativos), tone: "emerald" },
              { label: "no total", value: String(clientes.total) },
              ...(com("leads")
                ? [{ label: "leads convertidos", value: String(leads.convertidos) }]
                : []),
            ]}
          />
        )}

        {com("agenda") && (
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
        )}

        {com("vendedores") && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
