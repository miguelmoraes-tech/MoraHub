import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Primeiros passos" do nicho Impressão 3D na Visão Geral do dono. Cada passo é concluído por
 * DADO REAL da empresa (nunca marcado à mão) e leva à tela onde se faz. Passo de módulo desligado
 * aponta para Módulos. A lista some quando tudo está concluído.
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
  { chave: "precificacao", titulo: "Ajustar os parâmetros de precificação (tarifa de energia e valor da hora)", modulo: "p3d_precificacao", href: "/impressao-3d/precificacao" },
  { chave: "impressora", titulo: "Cadastrar a primeira impressora", modulo: "p3d_impressoras", href: "/impressao-3d/impressoras" },
  { chave: "material", titulo: "Cadastrar o primeiro material com preço", modulo: "p3d_estoque", href: "/impressao-3d/estoque" },
  { chave: "entrada_estoque", titulo: "Registrar a primeira entrada de estoque", modulo: "p3d_estoque", href: "/impressao-3d/estoque" },
  { chave: "produto", titulo: "Cadastrar o primeiro produto", modulo: "p3d_produtos", href: "/impressao-3d/produtos" },
  { chave: "orcamento", titulo: "Criar o primeiro orçamento", modulo: "p3d_orcamentos", href: "/impressao-3d/orcamentos" },
  { chave: "pedido", titulo: "Criar o primeiro pedido", modulo: "p3d_pedidos", href: "/impressao-3d/pedidos" },
];

export interface Passo extends PassoDef {
  concluido: boolean;
  /** false = módulo desligado: o link leva a Módulos. */
  moduloLigado: boolean;
  destino: string;
}

export type FatosPassos = Record<ChavePasso, boolean>;

/** Monta a lista a partir dos fatos lidos; módulo desligado nunca conta como concluído. */
export function montarPassos(fatos: FatosPassos, habilitados: readonly string[]): Passo[] {
  return PASSOS.map((p) => {
    const moduloLigado = habilitados.includes(p.modulo);
    return {
      ...p,
      concluido: moduloLigado && fatos[p.chave],
      moduloLigado,
      destino: moduloLigado ? p.href : "/modulos",
    };
  });
}

export function todosConcluidos(passos: readonly Passo[]): boolean {
  return passos.every((p) => p.concluido);
}

/** Parâmetros ajustados = tarifa de energia > 0 E valor da hora > 0. */
export function precificacaoAjustada(c: { tarifa_kwh?: unknown; valor_hora_mao_obra?: unknown } | null): boolean {
  return !!c && Number(c.tarifa_kwh) > 0 && Number(c.valor_hora_mao_obra) > 0;
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
          .select("tarifa_kwh, valor_hora_mao_obra")
          .eq("workspace_id", ws)
          .maybeSingle()
          .then(({ data, error }) => !error && precificacaoAjustada(data as { tarifa_kwh: number; valor_hora_mao_obra: number } | null))
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
