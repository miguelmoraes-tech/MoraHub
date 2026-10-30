import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Primeiros passos" do nicho Impressão 3D na Visão Geral do dono. Cada passo é concluído por
 * DADO REAL da empresa (nunca marcado à mão) e leva à tela onde se faz. Só entram passos de módulos
 * LIGADOS (a empresa enxuta não é cobrada por Orçamentos, Pedidos etc. que não usa). A lista some
 * quando tudo está concluído.
 */
export type ChavePasso =
  | "precificacao" | "impressora" | "material" | "entrada_estoque" | "produto" | "orcamento" | "pedido";

export interface PassoDef {
  chave: ChavePasso;
  titulo: string;
  modulo: string;
  href: string;
}

export const PASSOS: readonly PassoDef[] = [
  { chave: "material", titulo: "Cadastrar o primeiro filamento com o valor do kg", modulo: "p3d_estoque", href: "/impressao-3d/estoque" },
  { chave: "entrada_estoque", titulo: "Registrar a primeira entrada de estoque (quanto você comprou)", modulo: "p3d_estoque", href: "/impressao-3d/estoque" },
  { chave: "impressora", titulo: "Cadastrar a primeira impressora", modulo: "p3d_impressoras", href: "/impressao-3d/impressoras" },
  { chave: "precificacao", titulo: "Informar a tarifa de energia na calculadora de preço", modulo: "p3d_precificacao", href: "/impressao-3d/precificacao" },
  { chave: "produto", titulo: "Cadastrar o primeiro produto", modulo: "p3d_produtos", href: "/impressao-3d/produtos" },
  { chave: "orcamento", titulo: "Criar o primeiro orçamento", modulo: "p3d_orcamentos", href: "/impressao-3d/orcamentos" },
  { chave: "pedido", titulo: "Criar o primeiro pedido", modulo: "p3d_pedidos", href: "/impressao-3d/pedidos" },
];

export interface Passo extends PassoDef {
  concluido: boolean;
  /** Sempre true: passo de módulo desligado nem entra na lista. */
  moduloLigado: boolean;
  destino: string;
}

export type FatosPassos = Record<ChavePasso, boolean>;

/** Monta a lista a partir dos fatos lidos, só com os passos dos módulos ligados. */
export function montarPassos(fatos: FatosPassos, habilitados: readonly string[]): Passo[] {
  return PASSOS.filter((p) => habilitados.includes(p.modulo)).map((p) => ({
    ...p,
    concluido: fatos[p.chave],
    moduloLigado: true,
    destino: p.href,
  }));
}

export function todosConcluidos(passos: readonly Passo[]): boolean {
  return passos.every((p) => p.concluido);
}

/** Tarifa de energia informada = tarifa_kwh > 0 (o valor da hora é opcional: só entra em "Incluir também"). */
export function precificacaoAjustada(c: { tarifa_kwh?: unknown } | null): boolean {
  return !!c && Number(c.tarifa_kwh) > 0;
}

/** Módulos opcionais do nicho que a empresa enxuta pode adicionar em Módulos, na ordem do cartão. */
export const MODULOS_OPCIONAIS = [
  "p3d_orcamentos", "p3d_pedidos", "p3d_producao", "p3d_fornecedores",
  "p3d_qualidade", "p3d_expedicao", "p3d_dashboard", "p3d_relatorios",
] as const;

/** Opcionais ainda desligados; vazio = o cartão "Precisa de mais?" some. */
export function modulosOpcionaisFaltando(habilitados: readonly string[]): string[] {
  return MODULOS_OPCIONAIS.filter((m) => !habilitados.includes(m));
}

/**
 * Lê os fatos (contagens, sem valores) só dos módulos ligados, sempre pelo workspace_id. Qualquer
 * falha de leitura conta como "não concluído" (nunca marca um passo sem dado).
 */
export async function lerFatosPassos(
  supabase: SupabaseClient,
  ws: string,
  habilitados: readonly string[]
): Promise<FatosPassos> {
  const com = (m: string) => habilitados.includes(m);
  const existe = async (consulta: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count, error } = await consulta;
    return !error && (count ?? 0) > 0;
  };
  const nao = Promise.resolve(false);
  const CONTA = { count: "exact", head: true } as const;

  const [precificacao, impressora, material, entrada, produto, orcamento, pedido] = await Promise.all([
    com("p3d_precificacao")
      ? supabase
          .from("p3d_config_precificacao")
          .select("tarifa_kwh")
          .eq("workspace_id", ws)
          .maybeSingle()
          .then(({ data, error }) => !error && precificacaoAjustada(data as { tarifa_kwh: number } | null))
      : nao,
    com("p3d_impressoras") ? existe(supabase.from("p3d_impressoras").select("id", CONTA).eq("workspace_id", ws)) : nao,
    com("p3d_estoque") ? existe(supabase.from("p3d_materiais").select("id", CONTA).eq("workspace_id", ws).gt("preco_compra", 0)) : nao,
    com("p3d_estoque") ? existe(supabase.from("p3d_movimentos_estoque").select("id", CONTA).eq("workspace_id", ws).eq("tipo", "entrada")) : nao,
    com("p3d_produtos") ? existe(supabase.from("p3d_produtos").select("id", CONTA).eq("workspace_id", ws)) : nao,
    com("p3d_orcamentos") ? existe(supabase.from("p3d_orcamentos").select("id", CONTA).eq("workspace_id", ws)) : nao,
    com("p3d_pedidos") ? existe(supabase.from("p3d_pedidos").select("id", CONTA).eq("workspace_id", ws)) : nao,
  ]);
  return {
    precificacao, impressora, material, entrada_estoque: entrada, produto, orcamento, pedido,
  };
}
