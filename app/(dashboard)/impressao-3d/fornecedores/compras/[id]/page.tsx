import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoEdicao, getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getOpcoesMateriais } from "@/lib/impressao-3d/opcoes";
import { CompraDetalhe } from "@/components/impressao-3d/compra-detalhe";
import {
  COLUNAS_COMPRA, COLUNAS_COMPRA_ITEM, COLUNAS_FORNECEDOR,
  type Compra, type CompraItem, type Fornecedor,
} from "@/lib/impressao-3d/tipos-operacao";

export default async function CompraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await getAcessoModulo("p3d_fornecedores");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const { data: compra } = await supabase
    .from("p3d_compras")
    .select(COLUNAS_COMPRA)
    .eq("id", id)
    .eq("workspace_id", ws)
    .maybeSingle();
  if (!compra) notFound();

  const [{ data: itens }, { data: fornecedores }, materiais, acessoEstoque, acessoFinanceiro] = await Promise.all([
    supabase.from("p3d_compra_itens").select(COLUNAS_COMPRA_ITEM).eq("compra_id", id).eq("workspace_id", ws).order("created_at", { ascending: true }),
    supabase.from("p3d_fornecedores").select(COLUNAS_FORNECEDOR).eq("workspace_id", ws).order("nome", { ascending: true }),
    getOpcoesMateriais(),
    getAcessoEdicao("p3d_estoque"),
    getAcessoEdicao("financeiro"),
  ]);

  return (
    <CompraDetalhe
      compra={compra as unknown as Compra}
      itens={(itens ?? []) as unknown as CompraItem[]}
      fornecedores={(fornecedores ?? []) as unknown as Fornecedor[]}
      materiais={materiais}
      podeEditar={acesso.nivel === "edicao"}
      // Receber exige edição em Fornecedores E Estoque; conta a pagar exige edição no Financeiro.
      podeReceber={acesso.nivel === "edicao" && !!acessoEstoque}
      podeGerarContaPagar={!!acessoFinanceiro}
    />
  );
}
