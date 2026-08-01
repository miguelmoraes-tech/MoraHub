import { Wallet, LineChart, Megaphone, Scale, Users2, LifeBuoy, Wrench, Flag } from "lucide-react";
import { SetorResumoCard } from "@/components/dashboard-executivo/setor-resumo-card";
import { formatCurrency } from "@/lib/format";
import type { DashboardExecutivoOverview } from "@/lib/dashboard-executivo/get-overview";

function pct(value: number | null, digits = 1) {
  return value !== null ? `${value.toFixed(digits)}%` : "—";
}

export function DashboardExecutivoBoard({
  overview,
}: {
  overview: DashboardExecutivoOverview;
}) {
  const { financeiro, comercial, marketing, juridico, rh, suporte, tecnica, metas } = overview;

  const folhaLabel =
    rh.folhaMes.totalFuncionarios > 0
      ? `${rh.folhaMes.pagos}/${rh.folhaMes.totalFuncionarios}`
      : "não gerada";
  const fechamentoLabel =
    juridico.fechamentoMes.total > 0
      ? `${juridico.fechamentoMes.concluidos}/${juridico.fechamentoMes.total}`
      : "não gerado";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Dashboard Executivo</h1>
        <p className="text-sm text-zinc-500">
          Visão 360° da empresa — os números mais importantes de cada setor, numa tela só
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SetorResumoCard
          icon={Wallet}
          titulo="Financeiro"
          href="/dashboard/financeiro"
          stats={[
            {
              label: "saldo atual",
              value: formatCurrency(financeiro.saldoAtual),
              tone: financeiro.saldoAtual >= 0 ? "emerald" : "rose",
            },
            {
              label: "projetado próx. mês",
              value: formatCurrency(financeiro.saldoProjetadoProximoMes),
              tone: financeiro.saldoProjetadoProximoMes >= 0 ? "emerald" : "rose",
            },
            {
              label: "contas vencendo",
              value: String(financeiro.contasVencendoCount),
              tone: financeiro.contasVencendoCount > 0 ? "amber" : "zinc",
            },
          ]}
        />

        <SetorResumoCard
          icon={LineChart}
          titulo="Comercial"
          href="/comercial"
          stats={[
            { label: "leads no funil", value: String(comercial.leadsNoFunil) },
            { label: "taxa de conversão", value: pct(comercial.taxaConversao) },
            {
              label: comercial.meta ? comercial.meta.titulo : "meta do mês",
              value: comercial.meta ? pct(comercial.meta.progresso, 0) : "—",
              tone: comercial.meta && comercial.meta.progresso >= 100 ? "emerald" : "zinc",
            },
          ]}
        />

        <SetorResumoCard
          icon={Megaphone}
          titulo="Marketing"
          href="/marketing"
          stats={[
            { label: "campanhas ativas", value: String(marketing.campanhasAtivasCount) },
            {
              label: "ROI médio",
              value: pct(marketing.roiMedioAtivas),
              tone:
                marketing.roiMedioAtivas === null
                  ? "zinc"
                  : marketing.roiMedioAtivas >= 0
                    ? "emerald"
                    : "rose",
            },
            { label: "conteúdo na semana", value: String(marketing.conteudoPublicadoSemana) },
          ]}
        />

        <SetorResumoCard
          icon={Scale}
          titulo="Jurídico & Contábil"
          href="/juridico"
          stats={[
            {
              label: "compliance pendente",
              value: String(juridico.compliancePendenteCount),
              tone: juridico.compliancePendenteCount > 0 ? "amber" : "emerald",
            },
            {
              label: "processos com prazo próximo",
              value: String(juridico.processosProximosCount),
              tone: juridico.processosProximosCount > 0 ? "amber" : "zinc",
            },
            { label: "fechamento do mês", value: fechamentoLabel },
          ]}
        />

        <SetorResumoCard
          icon={Users2}
          titulo="RH"
          href="/rh"
          stats={[
            { label: "funcionários ativos", value: String(rh.funcionariosAtivos) },
            { label: "folha do mês", value: folhaLabel },
            {
              label: "férias vencendo",
              value: String(rh.feriasVencendoCount),
              tone: rh.feriasVencendoCount > 0 ? "amber" : "zinc",
            },
          ]}
        />

        <SetorResumoCard
          icon={LifeBuoy}
          titulo="Suporte"
          href="/suporte"
          stats={[
            {
              label: "tickets abertos",
              value: String(suporte.ticketsAbertos),
              tone: suporte.ticketsAbertos > 0 ? "amber" : "zinc",
            },
            {
              label: "SLA estourado",
              value: String(suporte.slaEstourados),
              tone: suporte.slaEstourados > 0 ? "rose" : "emerald",
            },
          ]}
        />

        <SetorResumoCard
          icon={Wrench}
          titulo="Central Técnica"
          href="/clientes"
          stats={[
            { label: "projetos ativos", value: String(tecnica.projetosAtivosCount) },
            { label: "manutenções (30d)", value: String(tecnica.manutencoesRecentesCount) },
          ]}
        />

        <SetorResumoCard
          icon={Flag}
          titulo="Metas do período atual"
          href="/metas"
          stats={[
            { label: "objetivos em andamento", value: String(metas.emAndamentoCount) },
            { label: "progresso médio", value: pct(metas.progressoMedio, 0) },
            {
              label: "atrasados",
              value: String(metas.atrasadosCount),
              tone: metas.atrasadosCount > 0 ? "rose" : "emerald",
            },
          ]}
        />
      </div>
    </div>
  );
}
