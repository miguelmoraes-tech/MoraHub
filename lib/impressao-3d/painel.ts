/**
 * Dashboard e relatórios do nicho Impressão 3D (Etapa C-1): período, leitura defensiva do
 * retorno das RPCs (p3d_painel, p3d_relatorio_*) e CSV gerado no cliente. Sem banco e sem React:
 * testado em scripts/testar-acesso.mts. O cálculo é do banco; aqui só se valida, lê e formata.
 *
 * Extra "custos": o banco já devolve `resultado` e os campos de lucro nulos para quem não tem o
 * extra, e os leitores abaixo NUNCA repassam custo/lucro/margem quando `verCustos` é false (camada
 * extra, só de tela, como nas Etapas A e B).
 */
import {
  adicionarDias, dataIsoValida, diasEntre, formatDataIso, hojeSaoPaulo, primeiroDiaDoMes, ultimoDiaDoMes,
} from "@/lib/impressao-3d/datas";

// --- Período -------------------------------------------------------------------------------------

export const PERIODO_MAXIMO_DIAS = 366;

export interface Periodo {
  de: string;
  ate: string;
}

export interface PeriodoResolvido {
  periodo: Periodo;
  /** true = nenhum período pedido: vale o mês corrente em São Paulo. */
  padrao: boolean;
  /** Motivo de o período pedido ter sido recusado (aí vale o padrão). */
  erro: string | null;
}

/** Mês corrente em America/Sao_Paulo: do dia 1º até hoje. */
export function periodoPadrao(hoje: string = hojeSaoPaulo()): Periodo {
  return { de: primeiroDiaDoMes(hoje), ate: hoje };
}

/** Texto do erro (ou null se o período é válido). */
export function validarPeriodo(de: unknown, ate: unknown): string | null {
  if (!dataIsoValida(de) || !dataIsoValida(ate)) return "Informe as duas datas do período no formato correto.";
  if (de > ate) return "A data inicial não pode ser depois da data final.";
  if (diasEntre(de, ate) + 1 > PERIODO_MAXIMO_DIAS) return `O período pode ter no máximo ${PERIODO_MAXIMO_DIAS} dias.`;
  return null;
}

/** Período dos parâmetros da URL: vazio = padrão; inválido = padrão + mensagem. */
export function resolverPeriodo(
  de: string | null | undefined,
  ate: string | null | undefined,
  hoje: string = hojeSaoPaulo()
): PeriodoResolvido {
  const padrao = periodoPadrao(hoje);
  if (!de && !ate) return { periodo: padrao, padrao: true, erro: null };
  const erro = validarPeriodo(de, ate);
  if (erro) return { periodo: padrao, padrao: true, erro };
  return { periodo: { de: de as string, ate: ate as string }, padrao: false, erro: null };
}

export interface AtalhoPeriodo extends Periodo {
  id: string;
  rotulo: string;
}

/** Atalhos de período (todos dentro de 366 dias), a partir de "hoje" em São Paulo. */
export function atalhosPeriodo(hoje: string = hojeSaoPaulo()): AtalhoPeriodo[] {
  const inicioMes = primeiroDiaDoMes(hoje);
  const fimMesAnterior = adicionarDias(inicioMes, -1);
  return [
    { id: "mes", rotulo: "Mês atual", de: inicioMes, ate: hoje },
    { id: "mes-anterior", rotulo: "Mês anterior", de: primeiroDiaDoMes(fimMesAnterior), ate: ultimoDiaDoMes(fimMesAnterior) },
    { id: "30d", rotulo: "Últimos 30 dias", de: adicionarDias(hoje, -29), ate: hoje },
    { id: "90d", rotulo: "Últimos 90 dias", de: adicionarDias(hoje, -89), ate: hoje },
    { id: "ano", rotulo: "Ano até hoje", de: `${hoje.slice(0, 4)}-01-01`, ate: hoje },
  ];
}

// --- Leitura defensiva ---------------------------------------------------------------------------

function objeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Número finito ou 0 (numeric do banco pode chegar como texto). */
export function num(v: unknown): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Número finito ou null (null/ausente/ilegível = "sem dado", nunca zero). */
export function numOuNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

// --- p3d_painel ----------------------------------------------------------------------------------

export interface PainelVendas {
  faturamento: number;
  pedidos: number;
  ticket_medio: number;
  recebido_no_periodo: number;
  a_receber_total: number;
  pedidos_por_status: { status: string; quantidade: number }[];
  pedidos_abertos: number;
  pedidos_atrasados: number;
}

export interface PainelResultado {
  lucro_estimado: number;
  custo_estimado: number;
  /** Fração (0,25 = 25 %) ou null sem base. */
  margem_estimada: number | null;
  custo_material_real: number;
  custo_maquina_falhas_estimado: number;
  observacao: string | null;
}

export interface PainelProducao {
  na_fila: number;
  imprimindo: number;
  concluidas_no_periodo: number;
  falhas_no_periodo: number;
  trabalhos_com_falha: number;
  horas_reais: number;
  /** Fração ou null (sem trabalho medido). */
  taxa_falha_real: number | null;
}

export interface MaterialBaixo {
  id: string;
  nome: string;
  saldo: number;
  minimo: number;
  unidade: string;
}

export interface PainelAlertas {
  por_severidade: { info: number; aviso: number; critico: number };
  estoque_baixo: MaterialBaixo[];
  manutencao_devida: number;
}

export interface Painel {
  periodo: { de: string; ate: string; hoje: string } | null;
  vendas: PainelVendas | null;
  /** null sem o extra "custos" (ou sem a seção no retorno): a tela não mostra custo/lucro/margem. */
  resultado: PainelResultado | null;
  producao: PainelProducao | null;
  alertas: PainelAlertas | null;
}

export function lerPainel(bruto: unknown, verCustos: boolean): Painel | null {
  const raiz = objeto(bruto);
  if (!raiz) return null;

  const per = objeto(raiz.periodo);
  const periodo =
    per && dataIsoValida(per.de) && dataIsoValida(per.ate)
      ? { de: per.de, ate: per.ate, hoje: dataIsoValida(per.hoje) ? per.hoje : hojeSaoPaulo() }
      : null;

  const v = objeto(raiz.vendas);
  const vendas: PainelVendas | null = v
    ? {
        faturamento: num(v.faturamento),
        pedidos: num(v.pedidos),
        ticket_medio: num(v.ticket_medio),
        recebido_no_periodo: num(v.recebido_no_periodo),
        a_receber_total: num(v.a_receber_total),
        pedidos_por_status: Object.entries(objeto(v.pedidos_por_status) ?? {})
          .map(([status, q]) => ({ status, quantidade: num(q) }))
          .filter((s) => s.quantidade > 0),
        pedidos_abertos: num(v.pedidos_abertos),
        pedidos_atrasados: num(v.pedidos_atrasados),
      }
    : null;

  const r = verCustos ? objeto(raiz.resultado) : null;
  const resultado: PainelResultado | null = r
    ? {
        lucro_estimado: num(r.lucro_estimado),
        custo_estimado: num(r.custo_estimado),
        margem_estimada: numOuNull(r.margem_estimada),
        custo_material_real: num(r.custo_material_real),
        custo_maquina_falhas_estimado: num(r.custo_maquina_falhas_estimado),
        observacao: texto(r.observacao),
      }
    : null;

  const p = objeto(raiz.producao);
  const producao: PainelProducao | null = p
    ? {
        na_fila: num(p.na_fila),
        imprimindo: num(p.imprimindo),
        concluidas_no_periodo: num(p.concluidas_no_periodo),
        falhas_no_periodo: num(p.falhas_no_periodo),
        trabalhos_com_falha: num(p.trabalhos_com_falha),
        horas_reais: num(p.horas_reais),
        taxa_falha_real: numOuNull(p.taxa_falha_real),
      }
    : null;

  const a = objeto(raiz.alertas);
  const sev = objeto(a?.por_severidade);
  const alertas: PainelAlertas | null = a
    ? {
        por_severidade: { info: num(sev?.info), aviso: num(sev?.aviso), critico: num(sev?.critico) },
        estoque_baixo: (Array.isArray(a.estoque_baixo) ? a.estoque_baixo : [])
          .map(objeto)
          .filter((m): m is Record<string, unknown> => !!m && typeof m.id === "string")
          .map((m) => ({
            id: m.id as string,
            nome: texto(m.nome) ?? "(sem nome)",
            saldo: num(m.saldo),
            minimo: num(m.minimo),
            unidade: texto(m.unidade) ?? "",
          })),
        manutencao_devida: num(a.manutencao_devida),
      }
    : null;

  return { periodo, vendas, resultado, producao, alertas };
}

// --- p3d_relatorio_vendas / produtos / produtividade ---------------------------------------------

export type Agrupamento = "dia" | "semana" | "mes";
export const AGRUPAMENTO_ROTULO: Record<Agrupamento, string> = { dia: "Dia", semana: "Semana", mes: "Mês" };

export function agrupamentoValido(v: unknown): Agrupamento {
  return v === "dia" || v === "semana" || v === "mes" ? v : "dia";
}

export type AbaRelatorio = "vendas" | "produtos" | "produtividade" | "gastos";
export const ABAS_RELATORIO: readonly AbaRelatorio[] = ["vendas", "produtos", "produtividade", "gastos"];
export const ABA_RELATORIO_ROTULO: Record<AbaRelatorio, string> = {
  vendas: "Vendas",
  produtos: "Produtos",
  produtividade: "Produtividade",
  gastos: "Gastos por pessoa",
};
/** Quantos produtos o relatório de produtos pode trazer (p_limite). */
export const LIMITES_PRODUTOS: readonly number[] = [10, 20, 50, 100];

export interface LinhaVendas {
  periodo: string;
  pedidos: number;
  faturamento: number;
  /** null sem o extra "custos". */
  lucro_estimado: number | null;
}

export interface LinhaProduto {
  produto_id: string | null;
  nome: string;
  quantidade: number;
  /** Antes do desconto do pedido. */
  faturamento: number;
  lucro_estimado: number | null;
  margem_estimada: number | null;
}

export interface LinhaProdutividade {
  impressora_id: string;
  nome: string;
  status: string;
  horas_uso_total: number;
  trabalhos_concluidos: number;
  trabalhos_falhos: number;
  horas_reais: number;
  peso_g: number;
  trabalhos_com_falha: number;
  taxa_falha_real: number | null;
  custo_falhas_estimado: number | null;
}

function linhas(bruto: unknown): Record<string, unknown>[] {
  return (Array.isArray(bruto) ? bruto : []).map(objeto).filter((l): l is Record<string, unknown> => !!l);
}

export function lerRelatorioVendas(bruto: unknown, verCustos: boolean): LinhaVendas[] {
  return linhas(bruto)
    .filter((l) => dataIsoValida(l.periodo))
    .map((l) => ({
      periodo: l.periodo as string,
      pedidos: num(l.pedidos),
      faturamento: num(l.faturamento),
      lucro_estimado: verCustos ? numOuNull(l.lucro_estimado) : null,
    }));
}

export function lerRelatorioProdutos(bruto: unknown, verCustos: boolean): LinhaProduto[] {
  return linhas(bruto).map((l) => ({
    produto_id: texto(l.produto_id),
    nome: texto(l.nome) ?? "(sem produto)",
    quantidade: num(l.quantidade),
    faturamento: num(l.faturamento),
    lucro_estimado: verCustos ? numOuNull(l.lucro_estimado) : null,
    margem_estimada: verCustos ? numOuNull(l.margem_estimada) : null,
  }));
}

export function lerRelatorioProdutividade(bruto: unknown, verCustos: boolean): LinhaProdutividade[] {
  return linhas(bruto).map((l) => ({
    impressora_id: texto(l.impressora_id) ?? "",
    nome: texto(l.nome) ?? "(sem nome)",
    status: texto(l.status) ?? "",
    horas_uso_total: num(l.horas_uso_total),
    trabalhos_concluidos: num(l.trabalhos_concluidos),
    trabalhos_falhos: num(l.trabalhos_falhos),
    horas_reais: num(l.horas_reais),
    peso_g: num(l.peso_g),
    trabalhos_com_falha: num(l.trabalhos_com_falha),
    taxa_falha_real: numOuNull(l.taxa_falha_real),
    custo_falhas_estimado: verCustos ? numOuNull(l.custo_falhas_estimado) : null,
  }));
}

/** Rótulo da linha de vendas conforme o agrupamento ("semana" = início da semana). */
export function rotuloPeriodo(iso: string, agrupar: Agrupamento): string {
  if (agrupar === "mes") return `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  if (agrupar === "semana") return `Semana de ${formatDataIso(iso)}`;
  return formatDataIso(iso);
}

/** Soma de uma coluna que pode ter null: null se NENHUMA linha tem valor (nada de zero inventado). */
export function somaOuNull(valores: readonly (number | null)[]): number | null {
  const presentes = valores.filter((v): v is number => v !== null);
  return presentes.length === 0 ? null : presentes.reduce((s, v) => s + v, 0);
}

// --- CSV (gerado no cliente a partir do retorno) -------------------------------------------------

/**
 * Célula de CSV (separador ";", decimal com vírgula, como o Excel em pt-BR espera). Texto que
 * começa com = + - @ ou tab/CR vira texto literal (prefixo "'"): nome de produto não executa
 * fórmula na planilha. Número nunca é prefixado (negativo continua negativo).
 */
export function csvCelula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return "";
    return String(Number(valor.toFixed(4))).replace(".", ",");
  }
  let t = valor;
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export interface ColunaCsv<T> {
  titulo: string;
  valor: (linha: T) => string | number | null;
}

/** CSV completo (com BOM, para o Excel reconhecer UTF-8; linhas separadas por CRLF). */
export function gerarCsv<T>(colunas: readonly ColunaCsv<T>[], linhasDados: readonly T[]): string {
  const cab = colunas.map((c) => csvCelula(c.titulo)).join(";");
  const corpo = linhasDados.map((l) => colunas.map((c) => csvCelula(c.valor(l))).join(";"));
  return `﻿${[cab, ...corpo].join("\r\n")}\r\n`;
}

export function nomeArquivoCsv(relatorio: string, p: Periodo): string {
  return `relatorio-${relatorio}-${p.de}_a_${p.ate}.csv`;
}
