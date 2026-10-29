import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { CONFIG_PADRAO, entradaParaRecalculo, podeVerCustos } from "@/lib/impressao-3d/regras";
import { ocultarCustosDoCalculo } from "@/lib/impressao-3d/calculo";
import { getOpcoesClientes, getOpcoesImpressoras, getOpcoesMateriais } from "@/lib/impressao-3d/opcoes";
import { OrcamentoDetalhe } from "@/components/impressao-3d/orcamento-detalhe";
import type { ProdutoOpcao } from "@/components/impressao-3d/simulador";
import type { ConfigPrecificacao, ItemOrcamento, Orcamento } from "@/lib/impressao-3d/tipos";

const COLUNAS_ORCAMENTO =
  "id, numero, cliente_id, titulo, status, validade, desconto_valor, subtotal, total, observacoes, enviado_em, aprovado_em, created_at";
const COLUNAS_ITEM =
  "id, orcamento_id, ordem, descricao, produto_id, variacao_id, quantidade, entrada, calculo, preco_total, preco_unitario, versao_formula, calculado_em";
const COLUNAS_CONFIG =
  "tarifa_kwh, valor_hora_mao_obra, desperdicio_pct, falha_pct, falha_fracao_perdida, modo_preco, margem_pct, markup_pct, impostos_pct, taxa_pagamento_pct, comissao_pct, taxa_fixa_pagamento, despesas_fixas_pct, arredondar_para, preco_minimo, base_custo_material";

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await getAcessoModulo("p3d_orcamentos");
  if (!acesso) redirect(HOME_DONO);
  const verCustos = podeVerCustos(acesso);
  const podeEditar = acesso.nivel === "edicao";
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const { data: orcamentoBruto } = await supabase
    .from("p3d_orcamentos")
    .select(verCustos ? `${COLUNAS_ORCAMENTO}, custo_total, lucro_total` : COLUNAS_ORCAMENTO)
    .eq("id", id)
    .eq("workspace_id", ws)
    .maybeSingle();
  if (!orcamentoBruto) notFound();
  const orcamento = { custo_total: 0, lucro_total: 0, ...(orcamentoBruto as unknown as Partial<Orcamento>) } as Orcamento;

  const [{ data: itens }, clientes, impressoras, materiais, { data: config }] = await Promise.all([
    supabase
      .from("p3d_orcamento_itens")
      .select(verCustos ? `${COLUNAS_ITEM}, custo_total, lucro` : COLUNAS_ITEM)
      .eq("orcamento_id", id)
      .eq("workspace_id", ws)
      .order("ordem", { ascending: true }),
    getOpcoesClientes(),
    getOpcoesImpressoras(),
    getOpcoesMateriais(),
    supabase.from("p3d_config_precificacao").select(COLUNAS_CONFIG).eq("workspace_id", ws).maybeSingle(),
  ]);

  // Produtos e variações para preencher um item (só para quem edita e vê o catálogo).
  let produtos: ProdutoOpcao[] = [];
  if (podeEditar && orcamento.status === "rascunho" && (await getAcessoModulo("p3d_produtos"))) {
    const [{ data: listaProdutos }, { data: listaVariacoes }] = await Promise.all([
      supabase
        .from("p3d_produtos")
        .select("id, nome, peso_estimado_g, horas_estimadas, impressora_id, material_id")
        .eq("workspace_id", ws)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("p3d_produto_variacoes")
        .select("id, produto_id, nome, peso_g, horas_estimadas, material_id")
        .eq("workspace_id", ws)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);
    produtos = ((listaProdutos ?? []) as unknown as Omit<ProdutoOpcao, "variacoes">[]).map((p) => ({
      ...p,
      variacoes: ((listaVariacoes ?? []) as unknown as (ProdutoOpcao["variacoes"][number] & { produto_id: string })[]).filter(
        (v) => v.produto_id === p.id
      ),
    }));
  }

  // Sem o extra "custos", o snapshot sai só com preços (o servidor remove o resto).
  const listaItens = ((itens ?? []) as unknown as Partial<ItemOrcamento>[]).map((i) => ({
    custo_total: 0,
    lucro: 0,
    ...i,
    calculo: verCustos ? i.calculo : ocultarCustosDoCalculo(i.calculo),
    // Parâmetros de custo (tarifa, preço do material, margem...) também são custo: ficam só os do item.
    entrada: verCustos ? (i.entrada ?? {}) : entradaParaRecalculo(i.entrada ?? {}),
  })) as ItemOrcamento[];

  return (
    <OrcamentoDetalhe
      orcamento={orcamento}
      itens={listaItens}
      clientes={clientes}
      impressoras={impressoras}
      materiais={materiais}
      produtos={produtos}
      config={(config as unknown as ConfigPrecificacao | null) ?? CONFIG_PADRAO}
      podeEditar={podeEditar}
      verCustos={verCustos}
    />
  );
}
