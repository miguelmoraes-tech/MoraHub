import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getOpcoesImpressoras, getOpcoesMateriais } from "@/lib/impressao-3d/opcoes";
import { assinarArquivos } from "@/lib/impressao-3d/storage";
import { ProdutoDetalhe } from "@/components/impressao-3d/produto-detalhe";
import type { ArquivoProduto, Produto, Variacao } from "@/lib/impressao-3d/tipos";

export default async function ProdutoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await getAcessoModulo("p3d_produtos");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const { data: produto } = await supabase
    .from("p3d_produtos")
    .select("id, workspace_id, nome, descricao, categoria, sku, impressora_id, material_id, peso_estimado_g, horas_estimadas, preco_venda, publicado_loja, ativo")
    .eq("id", id)
    .eq("workspace_id", ws)
    .maybeSingle();
  if (!produto) notFound();

  const [{ data: variacoes }, { data: arquivos }, impressoras, materiais] = await Promise.all([
    supabase
      .from("p3d_produto_variacoes")
      .select("id, produto_id, nome, sku, cor, tamanho, material_id, peso_g, horas_estimadas, preco_venda, ativo")
      .eq("produto_id", id)
      .eq("workspace_id", ws)
      .order("nome", { ascending: true }),
    supabase
      .from("p3d_produto_arquivos")
      .select("id, produto_id, variacao_id, tipo, nome, storage_path, tamanho_bytes, mime_type, created_at")
      .eq("produto_id", id)
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false }),
    getOpcoesImpressoras(),
    getOpcoesMateriais(),
  ]);

  const listaArquivos = (arquivos ?? []) as unknown as ArquivoProduto[];
  // Preview só das fotos; o resto baixa por link assinado sob demanda.
  const previews = await assinarArquivos(listaArquivos.filter((a) => a.tipo === "foto").map((a) => a.storage_path));

  return (
    <ProdutoDetalhe
      workspaceId={ws}
      produto={produto as unknown as Produto}
      variacoes={(variacoes ?? []) as unknown as Variacao[]}
      arquivos={listaArquivos}
      previews={Object.fromEntries(previews)}
      impressoras={impressoras}
      materiais={materiais}
      podeEditar={acesso.nivel === "edicao"}
    />
  );
}
