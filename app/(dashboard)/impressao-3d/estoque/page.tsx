import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { podeVerCustos } from "@/lib/impressao-3d/regras";
import { getOpcoesFornecedores } from "@/lib/impressao-3d/opcoes";
import { EstoqueBoard } from "@/components/impressao-3d/estoque-board";
import type { Material, MovimentoEstoque } from "@/lib/impressao-3d/tipos";

const COLUNAS_MATERIAL =
  "id, workspace_id, tipo, nome, marca, material, cor, cor_hex, diametro_mm, unidade, peso_liquido_rolo_g, estoque_atual, estoque_minimo, localizacao, fornecedor_id, ativo";
const COLUNAS_MOVIMENTO = "id, material_id, tipo, delta, saldo_apos, observacao, created_at";
const LIMITE_MOVIMENTOS = 500;

export default async function EstoquePage() {
  const acesso = await getAcessoModulo("p3d_estoque");
  if (!acesso) redirect(HOME_DONO);
  const abas = await getAbasVisiveis("p3d_estoque");
  const verCustos = podeVerCustos(acesso);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  // Custo só sai do servidor para quem tem o extra "custos" (só de tela).
  const [{ data: materiais }, { data: movimentos }, fornecedores] = await Promise.all([
    supabase
      .from("p3d_materiais")
      .select(verCustos ? `${COLUNAS_MATERIAL}, preco_compra, custo_cadastro, custo_medio, ultimo_custo` : COLUNAS_MATERIAL)
      .eq("workspace_id", ws)
      .order("nome", { ascending: true }),
    supabase
      .from("p3d_movimentos_estoque")
      .select(verCustos ? `${COLUNAS_MOVIMENTO}, custo_unitario, custo_total` : COLUNAS_MOVIMENTO)
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false })
      .limit(LIMITE_MOVIMENTOS),
    getOpcoesFornecedores(),
  ]);

  const listaMateriais = ((materiais ?? []) as unknown as Partial<Material>[]).map((m) => ({
    preco_compra: null,
    custo_cadastro: null,
    custo_medio: 0,
    ultimo_custo: 0,
    ...m,
  })) as Material[];
  const listaMovimentos = ((movimentos ?? []) as unknown as Partial<MovimentoEstoque>[]).map((m) => ({
    custo_unitario: null,
    custo_total: null,
    ...m,
  })) as MovimentoEstoque[];

  return (
    <EstoqueBoard
      abas={abas}
      materiais={listaMateriais}
      movimentos={listaMovimentos}
      podeEditar={acesso.nivel === "edicao"}
      verCustos={verCustos}
      limiteMovimentos={LIMITE_MOVIMENTOS}
      fornecedores={fornecedores}
    />
  );
}
