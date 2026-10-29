"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Aviso, Cartao, Vazio } from "@/components/impressao-3d/campos";
import { Natureza } from "@/components/impressao-3d/natureza";
import { SeletorPeriodo } from "@/components/impressao-3d/seletor-periodo";
import {
  ABAS_RELATORIO, ABA_RELATORIO_ROTULO, AGRUPAMENTO_ROTULO, LIMITES_PRODUTOS, atalhosPeriodo, gerarCsv,
  nomeArquivoCsv, rotuloPeriodo, somaOuNull,
  type AbaRelatorio, type Agrupamento, type ColunaCsv, type LinhaProdutividade, type LinhaProduto, type LinhaVendas,
  type Periodo,
} from "@/lib/impressao-3d/painel";
import { formatDataIso } from "@/lib/impressao-3d/datas";
import { STATUS_IMPRESSORA_ROTULO, type StatusImpressora } from "@/lib/impressao-3d/tipos";
import { formatGramas, formatHoras, formatMoeda, formatNumero, formatPercentualFracao } from "@/lib/impressao-3d/numeros";

const statusImpressora = (s: string) => STATUS_IMPRESSORA_ROTULO[s as StatusImpressora] ?? s;
const TH = "py-1.5 pr-3 font-medium";
const THD = "py-1.5 pr-3 text-right font-medium";
const TD = "py-1.5 pr-3";
const TDD = "py-1.5 pr-3 text-right tabular-nums";

function baixarCsv(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function BotaoCsv({ desabilitado, aoClicar }: { desabilitado: boolean; aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitado}
      className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" /> Exportar CSV
    </button>
  );
}

export function RelatoriosBoard({
  aba, abas, periodo, erroPeriodo, agrupar, limite, verCustos, erro, vendas, produtos, produtividade,
}: {
  aba: AbaRelatorio;
  /** Abas visíveis pela preferência de navegação (nunca vazia). */
  abas: string[];
  periodo: Periodo;
  erroPeriodo: string | null;
  agrupar: Agrupamento;
  limite: number;
  verCustos: boolean;
  erro: string | null;
  vendas: LinhaVendas[];
  produtos: LinhaProduto[];
  produtividade: LinhaProdutividade[];
}) {
  const extras: Record<string, string> = { aba, ...(aba === "vendas" ? { agrupar } : {}), ...(aba === "produtos" ? { limite: String(limite) } : {}) };
  const hrefAba = (a: AbaRelatorio) => {
    const q = new URLSearchParams({ aba: a, de: periodo.de, ate: periodo.ate });
    if (a === "vendas") q.set("agrupar", agrupar);
    if (a === "produtos") q.set("limite", String(limite));
    return `/impressao-3d/relatorios?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Relatórios</h1>
        <p className="text-sm text-zinc-500">
          Vendas, produtos e produtividade de {formatDataIso(periodo.de)} a {formatDataIso(periodo.ate)}.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-zinc-800" aria-label="Relatórios">
        {ABAS_RELATORIO.filter((a) => abas.includes(a)).map((a) => (
          <Link
            key={a}
            href={hrefAba(a)}
            aria-current={a === aba ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              a === aba ? "border-copper-500 text-copper-300" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {ABA_RELATORIO_ROTULO[a]}
          </Link>
        ))}
      </nav>

      <SeletorPeriodo
        baseHref="/impressao-3d/relatorios"
        periodo={periodo}
        atalhos={atalhosPeriodo()}
        extras={extras}
        erro={erroPeriodo}
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {!erro && aba === "vendas" && (
        <RelVendas linhas={vendas} periodo={periodo} agrupar={agrupar} verCustos={verCustos} />
      )}
      {!erro && aba === "produtos" && (
        <RelProdutos linhas={produtos} periodo={periodo} limite={limite} verCustos={verCustos} />
      )}
      {!erro && aba === "produtividade" && (
        <RelProdutividade linhas={produtividade} periodo={periodo} verCustos={verCustos} />
      )}
    </div>
  );
}

function RelVendas({ linhas, periodo, agrupar, verCustos }: { linhas: LinhaVendas[]; periodo: Periodo; agrupar: Agrupamento; verCustos: boolean }) {
  const totalLucro = verCustos ? somaOuNull(linhas.map((l) => l.lucro_estimado)) : null;
  const colunas: ColunaCsv<LinhaVendas>[] = [
    { titulo: AGRUPAMENTO_ROTULO[agrupar], valor: (l) => rotuloPeriodo(l.periodo, agrupar) },
    { titulo: "Pedidos", valor: (l) => l.pedidos },
    { titulo: "Faturamento (R$)", valor: (l) => l.faturamento },
    ...(verCustos ? [{ titulo: "Lucro estimado (R$)", valor: (l: LinhaVendas) => l.lucro_estimado }] : []),
  ];
  const href = (g: Agrupamento) =>
    `/impressao-3d/relatorios?${new URLSearchParams({ aba: "vendas", de: periodo.de, ate: periodo.ate, agrupar: g }).toString()}`;
  return (
    <Cartao
      titulo="Vendas por período"
      acoes={
        <BotaoCsv
          desabilitado={linhas.length === 0}
          aoClicar={() => baixarCsv(nomeArquivoCsv("vendas", periodo), gerarCsv(colunas, linhas))}
        />
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>Agrupar por</span>
        {(Object.keys(AGRUPAMENTO_ROTULO) as Agrupamento[]).map((g) => (
          <Link
            key={g}
            href={href(g)}
            aria-current={g === agrupar ? "true" : undefined}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              g === agrupar ? "border-copper-500/50 bg-copper-600/15 text-copper-300" : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {AGRUPAMENTO_ROTULO[g]}
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          Faturamento <Natureza tipo="real" />
          {verCustos && (
            <>
              Lucro <Natureza tipo="estimado" />
            </>
          )}
        </span>
      </div>
      {linhas.length === 0 ? (
        <Vazio>Nenhum pedido no período.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className={TH}>{AGRUPAMENTO_ROTULO[agrupar]}</th>
                <th className={THD}>Pedidos</th>
                <th className={THD}>Faturamento</th>
                {verCustos && <th className={THD}>Lucro estimado</th>}
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {linhas.map((l) => (
                <tr key={l.periodo} className="border-t border-zinc-800/70">
                  <td className={TD}>{rotuloPeriodo(l.periodo, agrupar)}</td>
                  <td className={TDD}>{formatNumero(l.pedidos, 0)}</td>
                  <td className={TDD}>{formatMoeda(l.faturamento)}</td>
                  {verCustos && <td className={TDD}>{l.lucro_estimado === null ? "—" : formatMoeda(l.lucro_estimado)}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-700 font-medium text-zinc-100">
              <tr>
                <td className={TD}>Total do período</td>
                <td className={TDD}>{formatNumero(linhas.reduce((s, l) => s + l.pedidos, 0), 0)}</td>
                <td className={TDD}>{formatMoeda(linhas.reduce((s, l) => s + l.faturamento, 0))}</td>
                {verCustos && <td className={TDD}>{totalLucro === null ? "—" : formatMoeda(totalLucro)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Cartao>
  );
}

function RelProdutos({ linhas, periodo, limite, verCustos }: { linhas: LinhaProduto[]; periodo: Periodo; limite: number; verCustos: boolean }) {
  const colunas: ColunaCsv<LinhaProduto>[] = [
    { titulo: "Produto", valor: (l) => l.nome },
    { titulo: "Quantidade", valor: (l) => l.quantidade },
    { titulo: "Faturamento antes do desconto (R$)", valor: (l) => l.faturamento },
    ...(verCustos
      ? [
          { titulo: "Lucro estimado (R$)", valor: (l: LinhaProduto) => l.lucro_estimado },
          { titulo: "Margem estimada (%)", valor: (l: LinhaProduto) => (l.margem_estimada === null ? null : l.margem_estimada * 100) },
        ]
      : []),
  ];
  const href = (n: number) =>
    `/impressao-3d/relatorios?${new URLSearchParams({ aba: "produtos", de: periodo.de, ate: periodo.ate, limite: String(n) }).toString()}`;
  return (
    <Cartao
      titulo={`Produtos mais vendidos (até ${limite})`}
      acoes={
        <BotaoCsv
          desabilitado={linhas.length === 0}
          aoClicar={() => baixarCsv(nomeArquivoCsv("produtos", periodo), gerarCsv(colunas, linhas))}
        />
      }
    >
      <div className="mb-3 space-y-2">
        <Aviso>
          O faturamento por item é <b>antes do desconto do pedido</b>: a soma dos itens pode passar do faturamento
          do Dashboard.{verCustos ? " A lista vem ordenada por lucro estimado." : " A lista vem ordenada por faturamento."}
        </Aviso>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>Mostrar</span>
          {LIMITES_PRODUTOS.map((n) => (
            <Link
              key={n}
              href={href(n)}
              aria-current={n === limite ? "true" : undefined}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                n === limite ? "border-copper-500/50 bg-copper-600/15 text-copper-300" : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {n}
            </Link>
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            Faturamento <Natureza tipo="real" />
            {verCustos && (
              <>
                Lucro e margem <Natureza tipo="estimado" />
              </>
            )}
          </span>
        </div>
      </div>
      {linhas.length === 0 ? (
        <Vazio>Nenhum produto vendido no período.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className={TH}>Produto</th>
                <th className={THD}>Quantidade</th>
                <th className={THD}>Faturamento</th>
                {verCustos && <th className={THD}>Lucro estimado</th>}
                {verCustos && <th className={THD}>Margem estimada</th>}
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {linhas.map((l, i) => (
                <tr key={`${l.produto_id ?? "sem"}-${i}`} className="border-t border-zinc-800/70">
                  <td className={TD}>{l.nome}</td>
                  <td className={TDD}>{formatNumero(l.quantidade)}</td>
                  <td className={TDD}>{formatMoeda(l.faturamento)}</td>
                  {verCustos && <td className={TDD}>{l.lucro_estimado === null ? "—" : formatMoeda(l.lucro_estimado)}</td>}
                  {verCustos && <td className={TDD}>{l.margem_estimada === null ? "—" : formatPercentualFracao(l.margem_estimada)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
}

function RelProdutividade({ linhas, periodo, verCustos }: { linhas: LinhaProdutividade[]; periodo: Periodo; verCustos: boolean }) {
  const colunas: ColunaCsv<LinhaProdutividade>[] = [
    { titulo: "Impressora", valor: (l) => l.nome },
    { titulo: "Status", valor: (l) => statusImpressora(l.status) },
    { titulo: "Horas de uso (total)", valor: (l) => l.horas_uso_total },
    { titulo: "Trabalhos concluídos", valor: (l) => l.trabalhos_concluidos },
    { titulo: "Trabalhos falhos", valor: (l) => l.trabalhos_falhos },
    { titulo: "Horas reais", valor: (l) => l.horas_reais },
    { titulo: "Peso (g)", valor: (l) => l.peso_g },
    { titulo: "Trabalhos com falha", valor: (l) => l.trabalhos_com_falha },
    { titulo: "Taxa de falha real (%)", valor: (l) => (l.taxa_falha_real === null ? null : l.taxa_falha_real * 100) },
    ...(verCustos ? [{ titulo: "Custo das falhas estimado (R$)", valor: (l: LinhaProdutividade) => l.custo_falhas_estimado }] : []),
  ];
  return (
    <Cartao
      titulo="Produtividade por impressora"
      acoes={
        <BotaoCsv
          desabilitado={linhas.length === 0}
          aoClicar={() => baixarCsv(nomeArquivoCsv("produtividade", periodo), gerarCsv(colunas, linhas))}
        />
      }
    >
      <div className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500">
        Horas, peso e falhas <Natureza tipo="real" />
        {verCustos && (
          <>
            Custo das falhas <Natureza tipo="estimado" />
          </>
        )}
        <span className="ml-2">As horas de uso total vêm do cadastro da impressora; as demais colunas, só do período.</span>
      </div>
      {linhas.length === 0 ? (
        <Vazio>Nenhuma impressora com trabalho no período.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className={TH}>Impressora</th>
                <th className={TH}>Status</th>
                <th className={THD}>Horas de uso</th>
                <th className={THD}>Concluídos</th>
                <th className={THD}>Falhos</th>
                <th className={THD}>Horas reais</th>
                <th className={THD}>Peso</th>
                <th className={THD}>Com falha</th>
                <th className={THD}>Taxa de falha</th>
                {verCustos && <th className={THD}>Custo das falhas</th>}
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {linhas.map((l) => (
                <tr key={l.impressora_id || l.nome} className="border-t border-zinc-800/70">
                  <td className={TD}>{l.nome}</td>
                  <td className={TD}>{statusImpressora(l.status)}</td>
                  <td className={TDD}>{formatHoras(l.horas_uso_total)}</td>
                  <td className={TDD}>{formatNumero(l.trabalhos_concluidos, 0)}</td>
                  <td className={TDD}>{formatNumero(l.trabalhos_falhos, 0)}</td>
                  <td className={TDD}>{formatHoras(l.horas_reais)}</td>
                  <td className={TDD}>{formatGramas(l.peso_g)}</td>
                  <td className={TDD}>{formatNumero(l.trabalhos_com_falha, 0)}</td>
                  <td className={TDD}>{l.taxa_falha_real === null ? "—" : formatPercentualFracao(l.taxa_falha_real)}</td>
                  {verCustos && <td className={TDD}>{l.custo_falhas_estimado === null ? "—" : formatMoeda(l.custo_falhas_estimado)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
}
