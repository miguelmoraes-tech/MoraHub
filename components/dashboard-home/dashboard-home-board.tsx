import Link from "next/link";
import {
  Target,
  UserX,
  Users,
  CalendarClock,
  UserCheck,
  Activity,
  Blocks,
  Megaphone,
  Wallet,
  Users2,
  Scale,
  Printer,
  Boxes,
  Package,
  Calculator,
  FileSpreadsheet,
  ShoppingCart,
  ClipboardList,
  Factory,
  ShieldCheck,
  Truck,
  Gauge,
  BarChart3,
  Bell,
  Plug,
} from "lucide-react";
import { SetorResumoCard } from "@/components/dashboard-executivo/setor-resumo-card";
import type { DashboardHomeOverview } from "@/lib/dashboard-home/get-overview";
import { getRotulos } from "@/lib/rotulos";
import { PrimeirosPassos } from "@/components/dashboard-home/primeiros-passos";

export async function DashboardHomeBoard({ overview }: { overview: DashboardHomeOverview }) {
  const {
    leads,
    renegados,
    clientes,
    agenda,
    vendedores,
    atividade,
    marketing,
    financeiro,
    rh,
    juridico,
    impressao3d,
    habilitados,
    primeirosPassos,
    secoes,
  } = overview;
  const rotulos = await getRotulos();
  const com = (chave: string) => habilitados.includes(chave);
  const temResumo = [
    "leads",
    "renegados",
    "clientes",
    "agenda",
    "vendedores",
    "marketing",
    "financeiro",
    "rh",
    "juridico",
    "p3d_impressoras",
    "p3d_estoque",
    "p3d_produtos",
    "p3d_precificacao",
    "p3d_orcamentos",
    "p3d_fornecedores",
    "p3d_pedidos",
    "p3d_producao",
    "p3d_qualidade",
    "p3d_expedicao",
    "p3d_dashboard",
    "p3d_relatorios",
    "p3d_automacoes",
    "p3d_integracoes",
  ].some(com);

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

      {primeirosPassos && <PrimeirosPassos passos={primeirosPassos} />}

      {secoes.includes("resumo") && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {com("leads") && (
          <SetorResumoCard
            icon={Target}
            titulo={rotulos.plural("leads")}
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
            titulo={rotulos.plural("renegados")}
            href="/renegados"
            stats={[
              {
                label: rotulos.texto("renegados", "cadastrados", () => "no total"),
                value: String(renegados.total),
              },
            ]}
          />
        )}

        {com("clientes") && (
          <SetorResumoCard
            icon={Users}
            titulo={rotulos.plural("clientes")}
            href="/clientes"
            stats={[
              { label: "ativos", value: String(clientes.ativos), tone: "emerald" },
              { label: "no total", value: String(clientes.total) },
              ...(com("leads")
                ? [
                    {
                      label: rotulos.texto("leads", "leads convertidos", ({ pluralMin }) => `conversões de ${pluralMin}`),
                      value: String(leads.convertidos),
                    },
                  ]
                : []),
            ]}
          />
        )}

        {com("agenda") && (
          <SetorResumoCard
            icon={CalendarClock}
            titulo={rotulos.plural("agenda")}
            href="/agenda"
            stats={[
              {
                label: rotulos.texto("agenda", "reuniões hoje", ({ pluralMin }) => `${pluralMin} hoje`),
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

        {com("marketing") && (
          <SetorResumoCard
            icon={Megaphone}
            titulo="Marketing"
            href="/marketing"
            stats={[
              { label: "campanhas ativas", value: String(marketing.campanhasAtivas) },
              { label: "conteúdos a publicar", value: String(marketing.conteudoPlanejado) },
            ]}
          />
        )}

        {com("financeiro") && (
          <SetorResumoCard
            icon={Wallet}
            titulo="Financeiro"
            href="/contas-pagar"
            stats={[
              {
                label: "contas a pagar abertas",
                value: String(financeiro.contasPagarAbertas),
                tone: financeiro.contasPagarAbertas > 0 ? "amber" : "zinc",
              },
              {
                label: "contas a receber abertas",
                value: String(financeiro.contasReceberAbertas),
              },
            ]}
          />
        )}

        {com("rh") && (
          <SetorResumoCard
            icon={Users2}
            titulo="RH"
            href="/rh"
            stats={[
              { label: "funcionários ativos", value: String(rh.funcionariosAtivos) },
              { label: "vagas abertas", value: String(rh.vagasAbertas) },
            ]}
          />
        )}

        {com("juridico") && (
          <SetorResumoCard
            icon={Scale}
            titulo="Jurídico & Contábil"
            href="/juridico"
            stats={[
              { label: "processos abertos", value: String(juridico.processosAbertos) },
              {
                label: "compliance pendente",
                value: String(juridico.compliancePendente),
                tone: juridico.compliancePendente > 0 ? "amber" : "emerald",
              },
            ]}
          />
        )}

        {com("p3d_impressoras") && (
          <SetorResumoCard
            icon={Printer}
            titulo={rotulos.plural("p3d_impressoras")}
            href="/impressao-3d/impressoras"
            stats={[
              { label: "ativas", value: String(impressao3d.impressoras.ativas) },
              {
                label: "manutenção vencida",
                value: String(impressao3d.impressoras.manutencaoVencida),
                tone: impressao3d.impressoras.manutencaoVencida > 0 ? "rose" : "emerald",
              },
            ]}
          />
        )}

        {com("p3d_estoque") && (
          <SetorResumoCard
            icon={Boxes}
            titulo={rotulos.plural("p3d_estoque")}
            href="/impressao-3d/estoque"
            stats={[
              { label: "materiais", value: String(impressao3d.estoque.itens) },
              {
                label: "abaixo do mínimo",
                value: String(impressao3d.estoque.abaixoDoMinimo),
                tone: impressao3d.estoque.abaixoDoMinimo > 0 ? "amber" : "emerald",
              },
            ]}
          />
        )}

        {com("p3d_produtos") && (
          <SetorResumoCard
            icon={Package}
            titulo={rotulos.plural("p3d_produtos")}
            href="/impressao-3d/produtos"
            stats={[{ label: "produtos ativos", value: String(impressao3d.produtos.ativos) }]}
          />
        )}

        {com("p3d_precificacao") && (
          <SetorResumoCard
            icon={Calculator}
            titulo={rotulos.plural("p3d_precificacao")}
            href="/impressao-3d/precificacao"
            stats={
              impressao3d.precificacao
                ? [
                    {
                      label: impressao3d.precificacao.modo === "margem" ? "margem padrão" : "markup padrão",
                      value: `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(impressao3d.precificacao.percentual)}%`,
                    },
                  ]
                : [{ label: "configuração", value: "pendente", tone: "amber" }]
            }
          />
        )}

        {com("p3d_orcamentos") && (
          <SetorResumoCard
            icon={FileSpreadsheet}
            titulo={rotulos.plural("p3d_orcamentos")}
            href="/impressao-3d/orcamentos"
            stats={[
              { label: "em rascunho", value: String(impressao3d.orcamentos.rascunhos) },
              { label: "enviados", value: String(impressao3d.orcamentos.enviados), tone: impressao3d.orcamentos.enviados > 0 ? "copper" : "zinc" },
            ]}
          />
        )}

        {com("p3d_pedidos") && (
          <SetorResumoCard
            icon={ClipboardList}
            titulo={rotulos.plural("p3d_pedidos")}
            href="/impressao-3d/pedidos"
            stats={[
              { label: "em aberto", value: String(impressao3d.pedidos.abertos) },
              {
                label: "prazo vencido",
                value: String(impressao3d.pedidos.prazoVencido),
                tone: impressao3d.pedidos.prazoVencido > 0 ? "rose" : "emerald",
              },
            ]}
          />
        )}

        {com("p3d_producao") && (
          <SetorResumoCard
            icon={Factory}
            titulo={rotulos.plural("p3d_producao")}
            href="/impressao-3d/producao"
            stats={[
              { label: "na fila", value: String(impressao3d.producao.fila) },
              { label: "imprimindo", value: String(impressao3d.producao.imprimindo), tone: impressao3d.producao.imprimindo > 0 ? "amber" : "zinc" },
              {
                label: "urgentes na fila",
                value: String(impressao3d.producao.urgentesNaFila),
                tone: impressao3d.producao.urgentesNaFila > 0 ? "rose" : "emerald",
              },
            ]}
          />
        )}

        {com("p3d_qualidade") && (
          <SetorResumoCard
            icon={ShieldCheck}
            titulo={rotulos.plural("p3d_qualidade")}
            href="/impressao-3d/qualidade"
            stats={
              impressao3d.qualidade
                ? [
                    {
                      label: "para inspecionar",
                      value: String(impressao3d.qualidade.paraInspecionar),
                      tone: impressao3d.qualidade.paraInspecionar > 0 ? "amber" : "emerald",
                    },
                    {
                      label: "reprovados",
                      value: String(impressao3d.qualidade.reprovados),
                      tone: impressao3d.qualidade.reprovados > 0 ? "rose" : "emerald",
                    },
                  ]
                : [{ label: "inspeções", value: "ver tela" }]
            }
          />
        )}

        {com("p3d_fornecedores") && (
          <SetorResumoCard
            icon={ShoppingCart}
            titulo={rotulos.plural("p3d_fornecedores")}
            href="/impressao-3d/fornecedores"
            stats={[
              { label: "fornecedores", value: String(impressao3d.fornecedores.ativos) },
              {
                label: "compras aguardando recebimento",
                value: String(impressao3d.fornecedores.comprasAprovadas),
                tone: impressao3d.fornecedores.comprasAprovadas > 0 ? "amber" : "zinc",
              },
            ]}
          />
        )}

        {com("p3d_expedicao") && (
          <SetorResumoCard
            icon={Truck}
            titulo={rotulos.plural("p3d_expedicao")}
            href="/impressao-3d/expedicao"
            stats={[{ label: "envios em aberto", value: String(impressao3d.expedicao.emAberto), tone: impressao3d.expedicao.emAberto > 0 ? "copper" : "zinc" }]}
          />
        )}

        {/* Etapa C-1: só contagens. Os valores (faturamento, lucro) ficam no Dashboard, atrás do extra "custos". */}
        {com("p3d_dashboard") && (
          <SetorResumoCard
            icon={Gauge}
            titulo={rotulos.plural("p3d_dashboard")}
            href="/impressao-3d/dashboard"
            stats={
              com("p3d_pedidos")
                ? [
                    { label: "pedidos abertos", value: String(impressao3d.pedidos.abertos) },
                    { label: "pedidos atrasados", value: String(impressao3d.pedidos.prazoVencido), tone: impressao3d.pedidos.prazoVencido > 0 ? "rose" : "emerald" },
                  ]
                : [{ label: "vendas, produção e alertas", value: "Abrir" }]
            }
          />
        )}

        {com("p3d_relatorios") && (
          <SetorResumoCard
            icon={BarChart3}
            titulo={rotulos.plural("p3d_relatorios")}
            href="/impressao-3d/relatorios"
            stats={[{ label: "vendas, produtos e produtividade", value: "Abrir" }]}
          />
        )}

        {com("p3d_automacoes") && (
          <SetorResumoCard
            icon={Bell}
            titulo={rotulos.plural("p3d_automacoes")}
            href="/impressao-3d/notificacoes"
            stats={[
              { label: "alertas abertos", value: String(impressao3d.alertas?.abertos ?? 0), tone: (impressao3d.alertas?.abertos ?? 0) > 0 ? "amber" : "emerald" },
              { label: "críticos", value: String(impressao3d.alertas?.criticos ?? 0), tone: (impressao3d.alertas?.criticos ?? 0) > 0 ? "rose" : "zinc" },
            ]}
          />
        )}

        {com("p3d_integracoes") && (
          <SetorResumoCard
            icon={Plug}
            titulo={rotulos.plural("p3d_integracoes")}
            href="/impressao-3d/integracoes"
            stats={[{ label: "estrutura pronta, sem conexão externa", value: "Ver" }]}
          />
        )}
      </div>
      )}
    </div>
  );
}
