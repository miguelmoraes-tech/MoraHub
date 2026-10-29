import type { SupabaseClient } from "@supabase/supabase-js";
import { abaixoDoMinimo, manutencaoVencida } from "@/lib/impressao-3d/regras";

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
}

export const RESUMO_P3D_VAZIO: ResumoImpressao3d = {
  impressoras: { ativas: 0, manutencaoVencida: 0 },
  estoque: { itens: 0, abaixoDoMinimo: 0 },
  produtos: { ativos: 0 },
  precificacao: null,
  orcamentos: { rascunhos: 0, enviados: 0 },
};

export async function getResumoImpressao3d(
  supabase: SupabaseClient,
  workspaceId: string,
  habilitados: readonly string[]
): Promise<ResumoImpressao3d> {
  const com = (chave: string) => habilitados.includes(chave);
  const nada = Promise.resolve({ data: null });

  const [impressorasRes, materiaisRes, produtosRes, configRes, orcamentosRes] = await Promise.all([
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
  ]);

  const impressoras = (impressorasRes.data ?? []) as {
    horas_uso: number;
    horas_ultima_manutencao: number;
    intervalo_manutencao_horas: number | null;
  }[];
  const materiais = (materiaisRes.data ?? []) as { estoque_atual: number; estoque_minimo: number }[];
  const config = configRes.data as { modo_preco: "margem" | "markup"; margem_pct: number; markup_pct: number } | null;
  const orcamentos = (orcamentosRes.data ?? []) as { status: string }[];

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
  };
}
