import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { podeVerCustos } from "@/lib/impressao-3d/regras";
import { lerResumoInvestimento, lerResumosMateriais } from "@/lib/impressao-3d/estoque-uso";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { getPessoasCompradoras } from "@/lib/impressao-3d/compradores";
import { getOpcoesFornecedores, getOpcoesProdutos } from "@/lib/impressao-3d/opcoes";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { EstoqueBoard } from "@/components/impressao-3d/estoque-board";
import type { Material, MaterialParte, MovimentoEstoque, MovimentoPeca, PecaEstoque } from "@/lib/impressao-3d/tipos";
import type { NumerosReferencia } from "@/lib/impressao-3d/pecas";

const COLUNAS_MATERIAL =
  "id, workspace_id, tipo, nome, marca, material, cor, cor_hex, diametro_mm, unidade, peso_liquido_rolo_g, estoque_atual, estoque_minimo, localizacao, fornecedor_id, kit, kit_itens, ativo";
const COLUNAS_MOVIMENTO =
  "id, material_id, tipo, delta, saldo_apos, observacao, user_id, comprador_user_id, comprador_nome, data_compra, created_at";
const COLUNAS_PECA = "id, produto_id, variacao_id, quantidade, estoque_minimo, localizacao";
const COLUNAS_MOVIMENTO_PECA = "id, peca_id, tipo, delta, saldo_apos, referencia_tipo, referencia_id, observacao, created_at";
const LIMITE_MOVIMENTOS = 500;

export default async function EstoquePage() {
  const acesso = await getAcessoModulo("p3d_estoque");
  if (!acesso) redirect(HOME_DONO);
  const abas = await getAbasVisiveis("p3d_estoque");
  const verCustos = podeVerCustos(acesso);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  // Custo só sai do servidor para quem tem o extra "custos" (só de tela).
  const [{ data: materiais }, { data: movimentos }, fornecedores, produtos, habilitados, { data: pecas }, { data: movimentosPecas }, acessoProdutosEdicao, acessoProducao, acessoPedidos, pessoas, { data: partes }, resumoMateriais, resumoGeral] = await Promise.all([
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
    getOpcoesProdutos(),
    getModulosHabilitados(ws),
    supabase
      .from("p3d_pecas_estoque")
      .select(verCustos ? `${COLUNAS_PECA}, custo_medio` : COLUNAS_PECA)
      .eq("workspace_id", ws)
      .order("created_at", { ascending: true }),
    supabase
      .from("p3d_movimentos_pecas")
      .select(verCustos ? `${COLUNAS_MOVIMENTO_PECA}, custo_unitario` : COLUNAS_MOVIMENTO_PECA)
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false })
      .limit(LIMITE_MOVIMENTOS),
    getAcessoModulo("p3d_produtos", "edicao"),
    getAcessoModulo("p3d_producao"),
    getAcessoModulo("p3d_pedidos"),
    getPessoasCompradoras(ws),
    supabase
      .from("p3d_material_partes")
      .select("id, material_id, nome, cor_hex, disponivel, acabou_em, observacao")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: true }),
    // Quanto foi pago em cada item e o resumo do investimento: dado de custo, só com o extra "custos".
    verCustos
      ? supabase.from("p3d_materiais_resumo").select("material_id, total_investido, compras").eq("workspace_id", ws)
      : Promise.resolve({ data: null }),
    verCustos ? supabase.rpc("p3d_resumo_investimento", { p_ws: ws }) : Promise.resolve({ data: null, error: null }),
  ]);
  const resumo = verCustos ? lerResumoInvestimento(resumoGeral.data) : null;
  const erroResumo = verCustos && resumoGeral.error ? mensagemRpc(resumoGeral.error, "Não foi possível carregar o resumo do investimento.") : null;

  const listaPecas = ((pecas ?? []) as unknown as Partial<PecaEstoque>[]).map((p) => ({ custo_medio: null, ...p })) as PecaEstoque[];
  const listaMovimentosPecas = ((movimentosPecas ?? []) as unknown as Partial<MovimentoPeca>[]).map((m) => ({
    custo_unitario: null,
    ...m,
  })) as MovimentoPeca[];

  // Nomes de produto/variação das linhas do estoque de peças (inclui produtos arquivados).
  const idsProduto = [...new Set(listaPecas.map((p) => p.produto_id))];
  const idsVariacao = [...new Set(listaPecas.flatMap((p) => (p.variacao_id ? [p.variacao_id] : [])))];
  const [{ data: nomesProduto }, { data: nomesVariacao }] = await Promise.all([
    idsProduto.length
      ? supabase.from("p3d_produtos").select("id, nome").eq("workspace_id", ws).in("id", idsProduto)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    idsVariacao.length
      ? supabase.from("p3d_produto_variacoes").select("id, nome").eq("workspace_id", ws).in("id", idsVariacao)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  // Origem dos movimentos ("Produção #3", "Pedido #12"): só com acesso aos módulos de origem.
  const numeros: NumerosReferencia = { producao: {}, pedido: {} };
  const idsDe = (tipo: string) => [
    ...new Set(listaMovimentosPecas.flatMap((m) => (m.referencia_tipo === tipo && m.referencia_id ? [m.referencia_id] : []))),
  ];
  const [idsProducao, idsPedido] = [idsDe("producao"), idsDe("pedido")];
  const [{ data: producoes }, { data: pedidos }] = await Promise.all([
    acessoProducao && idsProducao.length
      ? supabase.from("p3d_producao").select("id, numero").eq("workspace_id", ws).in("id", idsProducao)
      : Promise.resolve({ data: [] as { id: string; numero: number }[] }),
    acessoPedidos && idsPedido.length
      ? supabase.from("p3d_pedidos").select("id, numero").eq("workspace_id", ws).in("id", idsPedido)
      : Promise.resolve({ data: [] as { id: string; numero: number }[] }),
  ]);
  for (const r of (producoes ?? []) as { id: string; numero: number }[]) numeros.producao[r.id] = r.numero;
  for (const r of (pedidos ?? []) as { id: string; numero: number }[]) numeros.pedido[r.id] = r.numero;

  const listaMateriais = ((materiais ?? []) as unknown as Partial<Material>[]).map((m) => ({
    preco_compra: null,
    custo_cadastro: null,
    custo_medio: 0,
    ultimo_custo: 0,
    kit: false,
    kit_itens: null,
    ...m,
  })) as Material[];
  const listaMovimentos = ((movimentos ?? []) as unknown as Partial<MovimentoEstoque>[]).map((m) => ({
    custo_unitario: null,
    custo_total: null,
    user_id: null,
    comprador_user_id: null,
    comprador_nome: null,
    data_compra: null,
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
      compradores={{ pessoas, usuarioId: acesso.userId }}
      partes={(partes ?? []) as unknown as MaterialParte[]}
      pagoPorMaterial={Object.fromEntries(lerResumosMateriais(resumoMateriais.data))}
      resumo={resumo}
      erroResumo={erroResumo}
      // Gastos por pessoa: com Relatórios ligado é uma aba lá; sem ele, atalho aqui só para fundador/cofundador.
      atalhoGastos={acesso.ehDono && !habilitados.includes("p3d_relatorios") ? "/impressao-3d/estoque/gastos" : undefined}
      pecas={{
        itens: listaPecas,
        movimentos: listaMovimentosPecas,
        produtos,
        produtosLigado: habilitados.includes("p3d_produtos"),
        podeCriarProduto: !!acessoProdutosEdicao,
        nomesProduto: Object.fromEntries(((nomesProduto ?? []) as { id: string; nome: string }[]).map((p) => [p.id, p.nome])),
        nomesVariacao: Object.fromEntries(((nomesVariacao ?? []) as { id: string; nome: string }[]).map((v) => [v.id, v.nome])),
        numeros,
      }}
    />
  );
}
