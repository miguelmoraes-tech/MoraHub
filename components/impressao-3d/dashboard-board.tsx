import Link from "next/link";
import { Aviso, Cartao, Vazio } from "@/components/impressao-3d/campos";
import { Metrica } from "@/components/impressao-3d/natureza";
import { SeletorPeriodo } from "@/components/impressao-3d/seletor-periodo";
import { AtualizadorAlertas } from "@/components/impressao-3d/atualizador-alertas";
import { BarList } from "@/components/bar-list";
import { formatDataIso } from "@/lib/impressao-3d/datas";
import { atalhosPeriodo, type Painel, type Periodo } from "@/lib/impressao-3d/painel";
import { SEVERIDADES, SEVERIDADE_ROTULO } from "@/lib/impressao-3d/alertas";
import { STATUS_PEDIDO_ROTULO, type StatusPedido } from "@/lib/impressao-3d/tipos-operacao";
import { formatHoras, formatMoeda, formatNumero, formatPercentualFracao } from "@/lib/impressao-3d/numeros";

const TOM_SEVERIDADE = { critico: "rose", aviso: "amber", info: "zinc" } as const;

/**
 * Cards do Dashboard. Cada número leva o rótulo "Real" (pedidos, pagamentos, baixas de estoque,
 * trabalhos medidos) ou "Estimado" (custos cadastrados). A seção de resultado só existe com o extra
 * "custos": sem ele nada de custo, lucro ou margem chega à tela. Os gráficos usam só o retorno do banco.
 */
export function DashboardBoard({
  abas,
  empresaId,
  painel,
  periodoPedido,
  erroPeriodo,
  erro,
  verCustos,
  links,
}: {
  /** Seções visíveis pela preferência de navegação (vendas, resultado, producao, alertas). */
  abas: string[];
  empresaId: string;
  painel: Painel | null;
  periodoPedido: Periodo;
  erroPeriodo: string | null;
  erro: string | null;
  verCustos: boolean;
  links: { estoque: boolean; impressoras: boolean; notificacoes: boolean };
}) {
  // O período mostrado é o que o banco devolveu (é o que vale nos números).
  const periodo: Periodo = painel?.periodo ?? periodoPedido;
  const vendas = painel?.vendas ?? null;
  const resultado = painel?.resultado ?? null;
  const producao = painel?.producao ?? null;
  const alertas = painel?.alertas ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <AtualizadorAlertas empresaId={empresaId} />
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Vendas, produção e alertas de {formatDataIso(periodo.de)} a {formatDataIso(periodo.ate)}.
        </p>
      </div>

      <SeletorPeriodo
        baseHref="/impressao-3d/dashboard"
        periodo={periodo}
        atalhos={atalhosPeriodo()}
        erro={erroPeriodo}
      />

      <Aviso>
        <b>Real</b> vem de registros: pedidos não cancelados, pagamentos, baixas de estoque e trabalhos
        medidos. <b>Estimado</b> vem dos custos cadastrados (Precificação), não de medição.
      </Aviso>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {!erro && !painel && <Aviso tom="erro">Não foi possível ler o painel. Tente de novo.</Aviso>}

      {painel && (
        <>
          {abas.includes("vendas") && (
          <Cartao titulo="Vendas">
            {vendas ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metrica rotulo="Faturamento" valor={formatMoeda(vendas.faturamento)} natureza="real" dica="Pedidos não cancelados do período" />
                  <Metrica rotulo="Pedidos" valor={formatNumero(vendas.pedidos, 0)} natureza="real" />
                  <Metrica rotulo="Ticket médio" valor={formatMoeda(vendas.ticket_medio)} natureza="real" />
                  <Metrica rotulo="Recebido no período" valor={formatMoeda(vendas.recebido_no_periodo)} natureza="real" dica="Pagamentos registrados menos estornos" />
                  <Metrica rotulo="A receber (total)" valor={formatMoeda(vendas.a_receber_total)} natureza="real" dica="Saldo em aberto de todos os pedidos" />
                  <Metrica rotulo="Pedidos abertos" valor={formatNumero(vendas.pedidos_abertos, 0)} natureza="real" />
                  <Metrica
                    rotulo="Pedidos atrasados"
                    valor={formatNumero(vendas.pedidos_atrasados, 0)}
                    natureza="real"
                    tom={vendas.pedidos_atrasados > 0 ? "rose" : "emerald"}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-medium text-zinc-400">Pedidos por status</h3>
                  {vendas.pedidos_por_status.length === 0 ? (
                    <Vazio>Nenhum pedido no período.</Vazio>
                  ) : (
                    <BarList
                      items={vendas.pedidos_por_status.map((s) => ({
                        label: STATUS_PEDIDO_ROTULO[s.status as StatusPedido] ?? s.status,
                        count: s.quantidade,
                      }))}
                    />
                  )}
                </div>
              </div>
            ) : (
              <Vazio>O banco não devolveu os dados de vendas.</Vazio>
            )}
          </Cartao>
          )}

          {abas.includes("resultado") && verCustos && resultado && (
            <Cartao titulo="Resultado">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Metrica
                    rotulo="Lucro"
                    valor={formatMoeda(resultado.lucro_estimado)}
                    natureza="estimado"
                    tom={resultado.lucro_estimado < 0 ? "rose" : "emerald"}
                  />
                  <Metrica rotulo="Custo" valor={formatMoeda(resultado.custo_estimado)} natureza="estimado" />
                  <Metrica
                    rotulo="Margem"
                    valor={resultado.margem_estimada === null ? "—" : formatPercentualFracao(resultado.margem_estimada)}
                    natureza="estimado"
                  />
                  <Metrica
                    rotulo="Custo de material"
                    valor={formatMoeda(resultado.custo_material_real)}
                    natureza="real"
                    dica="Pelas baixas de estoque das produções"
                  />
                  <Metrica
                    rotulo="Custo de máquina das falhas"
                    valor={formatMoeda(resultado.custo_maquina_falhas_estimado)}
                    natureza="estimado"
                  />
                </div>
                {resultado.observacao && <p className="text-xs text-zinc-500">{resultado.observacao}</p>}
              </div>
            </Cartao>
          )}

          {abas.includes("producao") && (
          <Cartao titulo="Produção">
            {producao ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metrica rotulo="Na fila" valor={formatNumero(producao.na_fila, 0)} natureza="real" />
                <Metrica rotulo="Imprimindo" valor={formatNumero(producao.imprimindo, 0)} natureza="real" />
                <Metrica rotulo="Concluídas no período" valor={formatNumero(producao.concluidas_no_periodo, 0)} natureza="real" />
                <Metrica
                  rotulo="Falhas no período"
                  valor={formatNumero(producao.falhas_no_periodo, 0)}
                  natureza="real"
                  tom={producao.falhas_no_periodo > 0 ? "amber" : "zinc"}
                />
                <Metrica rotulo="Trabalhos com falha" valor={formatNumero(producao.trabalhos_com_falha, 0)} natureza="real" />
                <Metrica rotulo="Horas reais" valor={formatHoras(producao.horas_reais)} natureza="real" dica="Informadas ao concluir" />
                <Metrica
                  rotulo="Taxa de falha"
                  valor={producao.taxa_falha_real === null ? "—" : formatPercentualFracao(producao.taxa_falha_real)}
                  natureza="real"
                  dica={producao.taxa_falha_real === null ? "Sem trabalho medido no período" : "Trabalhos com falha ÷ concluídos e falhos"}
                />
              </div>
            ) : (
              <Vazio>O banco não devolveu os dados de produção.</Vazio>
            )}
          </Cartao>
          )}

          {abas.includes("alertas") && (
          <Cartao titulo="Alertas">
            {alertas ? (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {SEVERIDADES.map((s) => (
                    <Metrica
                      key={s}
                      rotulo={SEVERIDADE_ROTULO[s]}
                      valor={formatNumero(alertas.por_severidade[s], 0)}
                      tom={alertas.por_severidade[s] > 0 ? TOM_SEVERIDADE[s] : "zinc"}
                      href={links.notificacoes ? "/impressao-3d/notificacoes" : undefined}
                    />
                  ))}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium text-zinc-400">Materiais abaixo do mínimo</h3>
                  {alertas.estoque_baixo.length === 0 ? (
                    <Vazio>Nenhum material abaixo do mínimo.</Vazio>
                  ) : (
                    <ul className="divide-y divide-zinc-800/70 text-sm">
                      {alertas.estoque_baixo.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                          {links.estoque ? (
                            <Link href="/impressao-3d/estoque" className="text-zinc-200 hover:text-copper-300">
                              {m.nome}
                            </Link>
                          ) : (
                            <span className="text-zinc-200">{m.nome}</span>
                          )}
                          <span className="text-xs tabular-nums text-zinc-500">
                            saldo {formatNumero(m.saldo)} {m.unidade} · mínimo {formatNumero(m.minimo)} {m.unidade}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-300">Impressoras com manutenção devida</span>
                  {links.impressoras && alertas.manutencao_devida > 0 ? (
                    <Link href="/impressao-3d/impressoras" className="font-semibold text-rose-400 hover:text-rose-300">
                      {alertas.manutencao_devida} →
                    </Link>
                  ) : (
                    <span className={`font-semibold ${alertas.manutencao_devida > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {alertas.manutencao_devida}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <Vazio>O banco não devolveu os alertas.</Vazio>
            )}
          </Cartao>
          )}
        </>
      )}
    </div>
  );
}
