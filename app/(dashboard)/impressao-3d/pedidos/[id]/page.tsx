import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoEdicao, getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { entradaParaRecalculo, podeVerCustos } from "@/lib/impressao-3d/regras";
import { ocultarCustosDoCalculo } from "@/lib/impressao-3d/calculo";
import { getOpcoesClientes, getOpcoesProdutos } from "@/lib/impressao-3d/opcoes";
import { PedidoDetalhe } from "@/components/impressao-3d/pedido-detalhe";
import {
  COLUNAS_PEDIDO, COLUNAS_PEDIDO_HISTORICO, COLUNAS_PEDIDO_ITEM, COLUNAS_PEDIDO_PAGAMENTO,
  type Pedido, type PedidoHistorico, type PedidoItem, type PedidoPagamento, type Trabalho,
} from "@/lib/impressao-3d/tipos-operacao";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";
import { chaveEstoquePeca } from "@/lib/impressao-3d/pecas";

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await getAcessoModulo("p3d_pedidos");
  if (!acesso) redirect(HOME_DONO);
  const verCustos = podeVerCustos(acesso);
  const podeEditar = acesso.nivel === "edicao";
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const { data: pedidoBruto } = await supabase
    .from("p3d_pedidos")
    .select(verCustos ? `${COLUNAS_PEDIDO}, custo_total, lucro_total` : COLUNAS_PEDIDO)
    .eq("id", id)
    .eq("workspace_id", ws)
    .maybeSingle();
  if (!pedidoBruto) notFound();
  const pedido = { custo_total: 0, lucro_total: 0, ...(pedidoBruto as unknown as Partial<Pedido>) } as Pedido;

  const acessoProducaoLeitura = await getAcessoModulo("p3d_producao");
  const [
    { data: itens }, { data: pagamentos }, { data: historico }, { data: trabalhos },
    clientes, produtos, podeProducao, podeFinanceiro, acessoEstoqueLeitura, acessoEstoqueEdicao,
  ] = await Promise.all([
    supabase
      .from("p3d_pedido_itens")
      .select(verCustos ? `${COLUNAS_PEDIDO_ITEM}, custo_unitario, custo_total, lucro` : COLUNAS_PEDIDO_ITEM)
      .eq("pedido_id", id)
      .eq("workspace_id", ws)
      .order("ordem", { ascending: true }),
    supabase.from("p3d_pedido_pagamentos").select(COLUNAS_PEDIDO_PAGAMENTO).eq("pedido_id", id).eq("workspace_id", ws).order("created_at", { ascending: false }),
    supabase.from("p3d_pedido_historico").select(COLUNAS_PEDIDO_HISTORICO).eq("pedido_id", id).eq("workspace_id", ws).order("created_at", { ascending: false }),
    acessoProducaoLeitura
      ? supabase.from("p3d_producao").select("id, numero, descricao, status, quantidade, qualidade").eq("pedido_id", id).eq("workspace_id", ws).order("numero", { ascending: true })
      : Promise.resolve({ data: null }),
    getOpcoesClientes(),
    getOpcoesProdutos(),
    getAcessoEdicao("p3d_producao"),
    // O pagamento só pode virar conta a receber com o Financeiro ligado e edição nele.
    getAcessoEdicao("financeiro"),
    // Estoque de peças: "Em estoque: N" com leitura; baixar/devolver exige edição em Pedidos E em Estoque.
    getAcessoModulo("p3d_estoque"),
    getAcessoEdicao("p3d_estoque"),
  ]);

  let estoquePecas: Record<string, number> | null = null;
  if (acessoEstoqueLeitura) {
    const ids = [...new Set(((itens ?? []) as unknown as { produto_id: string | null }[]).flatMap((i) => (i.produto_id ? [i.produto_id] : [])))];
    estoquePecas = {};
    if (ids.length > 0) {
      const { data: pecas } = await supabase
        .from("p3d_pecas_estoque")
        .select("produto_id, variacao_id, quantidade")
        .eq("workspace_id", ws)
        .in("produto_id", ids);
      for (const p of (pecas ?? []) as { produto_id: string; variacao_id: string | null; quantidade: number }[]) {
        estoquePecas[chaveEstoquePeca(p.produto_id, p.variacao_id)] = p.quantidade;
      }
    }
  }

  // Sem o extra "custos", o snapshot sai só com preços e os parâmetros de custo ficam de fora.
  const listaItens = ((itens ?? []) as unknown as Partial<PedidoItem>[]).map((i) => ({
    custo_unitario: 0,
    custo_total: 0,
    lucro: 0,
    ...i,
    calculo: verCustos ? i.calculo : ocultarCustosDoCalculo(i.calculo),
    entrada: verCustos ? (i.entrada ?? {}) : entradaParaRecalculo((i.entrada ?? {}) as Record<string, unknown>),
  })) as PedidoItem[];

  return (
    <PedidoDetalhe
      pedido={pedido}
      itens={listaItens}
      pagamentos={(pagamentos ?? []) as unknown as PedidoPagamento[]}
      historico={(historico ?? []) as unknown as PedidoHistorico[]}
      trabalhos={acessoProducaoLeitura ? ((trabalhos ?? []) as unknown as Pick<Trabalho, "id" | "numero" | "descricao" | "status" | "quantidade" | "qualidade">[]) : null}
      clientes={clientes}
      produtos={produtos}
      podeEditar={podeEditar}
      verCustos={verCustos}
      podeGerarProducao={!!podeProducao}
      podeLancarFinanceiro={!!podeFinanceiro}
      estoquePecas={estoquePecas}
      podeBaixarPecas={podeEditar && !!acessoEstoqueEdicao}
      hoje={hojeSaoPaulo()}
    />
  );
}
