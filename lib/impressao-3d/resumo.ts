import type { SupabaseClient } from "@supabase/supabase-js";
import { abaixoDoMinimo, manutencaoVencida } from "@/lib/impressao-3d/regras";
import { prazoVencido, urgentesNaFila } from "@/lib/impressao-3d/regras-operacao";
import type { Prioridade, StatusPedido, StatusProducao } from "@/lib/impressao-3d/tipos-operacao";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";

/**
 * Números do nicho Impressão 3D para a Visão Geral do dono: só contagens (sem
 * valores) e só dos módulos ligados — módulo desligado não gera consulta.
 */
export interface ResumoImpressao3d {
  impressoras: { ativas: number; manutencaoVencida: number };
  estoque: { itens: number; abaixoDoMinimo: number };
  produtos: { ativos: number };
  precificacao: { modo: "margem" | "markup"; percentual: number } | null;
  orcamentos: { rascunhos: number; enviados: number };
  // Etapa B
  fornecedores: { ativos: number; comprasAprovadas: number };
  pedidos: { abertos: number; prazoVencido: number };
  producao: { fila: number; imprimindo: number; urgentesNaFila: number };
  /** null = Qualidade desligada ou sem a contagem de Produção. */
  qualidade: { paraInspecionar: number; reprovados: number } | null;
  expedicao: { emAberto: number };
}

export const RESUMO_P3D_VAZIO: ResumoImpressao3d = {
  impressoras: { ativas: 0, manutencaoVencida: 0 },
  estoque: { itens: 0, abaixoDoMinimo: 0 },
  produtos: { ativos: 0 },
  precificacao: null,
  orcamentos: { rascunhos: 0, enviados: 0 },
  fornecedores: { ativos: 0, comprasAprovadas: 0 },
  pedidos: { abertos: 0, prazoVencido: 0 },
  producao: { fila: 0, imprimindo: 0, urgentesNaFila: 0 },
  qualidade: null,
  expedicao: { emAberto: 0 },
};

export async function getResumoImpressao3d(
  supabase: SupabaseClient,
  workspaceId: string,
  habilitados: readonly string[]
): Promise<ResumoImpressao3d> {
  const com = (chave: string) => habilitados.includes(chave);
  const nada = Promise.resolve({ data: null });

  const [
    impressorasRes, materiaisRes, produtosRes, configRes, orcamentosRes,
    fornecedoresRes, comprasRes, pedidosRes, producaoRes, enviosRes,
  ] = await Promise.all([
    com("p3d_impressoras")
      ? supabase
          .from("p3d_impressoras")
          .select("horas_uso, horas_ultima_manutencao, intervalo_manutencao_horas")
          .eq("workspace_id", workspaceId)
          .eq("ativo", true)
      : nada,
    com("p3d_estoque")
      ? supabase
          .from("p3d_materiais")
          .select("estoque_atual, estoque_minimo")
          .eq("workspace_id", workspaceId)
          .eq("ativo", true)
      : nada,
    com("p3d_produtos")
      ? supabase.from("p3d_produtos").select("id").eq("workspace_id", workspaceId).eq("ativo", true)
      : nada,
    com("p3d_precificacao")
      ? supabase
          .from("p3d_config_precificacao")
          .select("modo_preco, margem_pct, markup_pct")
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : nada,
    com("p3d_orcamentos")
      ? supabase.from("p3d_orcamentos").select("status").eq("workspace_id", workspaceId).in("status", ["rascunho", "enviado"])
      : nada,
    com("p3d_fornecedores")
      ? supabase.from("p3d_fornecedores").select("id").eq("workspace_id", workspaceId).eq("ativo", true)
      : nada,
    com("p3d_fornecedores")
      ? supabase.from("p3d_compras").select("id").eq("workspace_id", workspaceId).eq("status", "aprovada")
      : nada,
    com("p3d_pedidos")
      ? supabase
          .from("p3d_pedidos")
          .select("status, prazo_entrega")
          .eq("workspace_id", workspaceId)
          .in("status", ["novo", "confirmado", "em_producao", "pronto"])
      : nada,
    // A contagem de Producao alimenta tambem o card de Qualidade (trabalhos concluidos e reprovados).
    com("p3d_producao") || com("p3d_qualidade")
      ? supabase
          .from("p3d_producao")
          .select("status, prioridade, qualidade")
          .eq("workspace_id", workspaceId)
          .in("status", ["fila", "imprimindo", "concluida"])
      : nada,
    com("p3d_expedicao")
      ? supabase
          .from("p3d_envios")
          .select("id")
          .eq("workspace_id", workspaceId)
          .in("status", ["preparando", "postado", "em_transito", "problema"])
      : nada,
  ]);

  const impressoras = (impressorasRes.data ?? []) as {
    horas_uso: number;
    horas_ultima_manutencao: number;
    intervalo_manutencao_horas: number | null;
  }[];
  const materiais = (materiaisRes.data ?? []) as { estoque_atual: number; estoque_minimo: number }[];
  const config = configRes.data as { modo_preco: "margem" | "markup"; margem_pct: number; markup_pct: number } | null;
  const orcamentos = (orcamentosRes.data ?? []) as { status: string }[];

  const pedidosAbertos = (pedidosRes.data ?? []) as { status: StatusPedido; prazo_entrega: string | null }[];
  const hoje = hojeSaoPaulo();
  const trabalhos = (producaoRes.data ?? []) as { status: StatusProducao; prioridade: Prioridade; qualidade: string }[];

  return {
    impressoras: {
      ativas: impressoras.length,
      manutencaoVencida: impressoras.filter(manutencaoVencida).length,
    },
    estoque: { itens: materiais.length, abaixoDoMinimo: materiais.filter(abaixoDoMinimo).length },
    produtos: { ativos: (produtosRes.data ?? []).length },
    precificacao: config
      ? { modo: config.modo_preco, percentual: config.modo_preco === "margem" ? config.margem_pct : config.markup_pct }
      : null,
    orcamentos: {
      rascunhos: orcamentos.filter((o) => o.status === "rascunho").length,
      enviados: orcamentos.filter((o) => o.status === "enviado").length,
    },
    fornecedores: { ativos: (fornecedoresRes.data ?? []).length, comprasAprovadas: (comprasRes.data ?? []).length },
    pedidos: {
      abertos: pedidosAbertos.length,
      prazoVencido: pedidosAbertos.filter((p) => prazoVencido(p, hoje)).length,
    },
    producao: {
      fila: trabalhos.filter((t) => t.status === "fila").length,
      imprimindo: trabalhos.filter((t) => t.status === "imprimindo").length,
      urgentesNaFila: urgentesNaFila(trabalhos),
    },
    qualidade: com("p3d_qualidade")
      ? {
          paraInspecionar: trabalhos.filter((t) => t.status === "concluida" && t.qualidade === "pendente").length,
          reprovados: trabalhos.filter((t) => t.status === "concluida" && t.qualidade === "reprovada").length,
        }
      : null,
    expedicao: { emAberto: (enviosRes.data ?? []).length },
  };
}
