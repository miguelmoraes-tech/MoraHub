import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getOpcoesImpressoras, getOpcoesMateriais } from "@/lib/impressao-3d/opcoes";
import { ProdutosBoard } from "@/components/impressao-3d/produtos-board";
import type { Produto } from "@/lib/impressao-3d/tipos";

export default async function ProdutosPage() {
  const acesso = await getAcessoModulo("p3d_produtos");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const [{ data: produtos }, { data: variacoes }, impressoras, materiais] = await Promise.all([
    supabase
      .from("p3d_produtos")
      .select("id, workspace_id, nome, descricao, categoria, sku, impressora_id, material_id, peso_estimado_g, horas_estimadas, preco_venda, publicado_loja, ativo")
      .eq("workspace_id", ws)
      .order("nome", { ascending: true }),
    supabase.from("p3d_produto_variacoes").select("produto_id").eq("workspace_id", ws),
    getOpcoesImpressoras(),
    getOpcoesMateriais(),
  ]);

  const variacoesPorProduto: Record<string, number> = {};
  for (const v of (variacoes ?? []) as { produto_id: string }[]) {
    variacoesPorProduto[v.produto_id] = (variacoesPorProduto[v.produto_id] ?? 0) + 1;
  }

  return (
    <ProdutosBoard
      produtos={(produtos ?? []) as unknown as Produto[]}
      variacoesPorProduto={variacoesPorProduto}
      impressoras={impressoras}
      materiais={materiais}
      podeEditar={acesso.nivel === "edicao"}
    />
  );
}
