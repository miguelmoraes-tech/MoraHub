import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import type { Impressora, Material } from "@/lib/impressao-3d/tipos";

/**
 * Listas para escolher impressora, material e cliente em outras telas (produtos,
 * simulador, orçamentos). Cada leitura confere o acesso ao módulo DONO da lista:
 * quem não pode ver Impressoras/Estoque/Clientes recebe lista vazia (e a tela
 * avisa), nunca um erro. Sempre por workspace_id da empresa ativa. Material não
 * leva nenhum campo de custo (o extra "custos" é do módulo Estoque).
 */

export type OpcaoImpressora = Pick<
  Impressora,
  | "id" | "nome" | "marca" | "modelo" | "potencia_media_kw" | "valor_aquisicao" | "valor_residual"
  | "vida_util_horas" | "manutencao_hora" | "manutencao_ciclo"
>;
export type OpcaoMaterial = Pick<Material, "id" | "nome" | "tipo" | "unidade" | "cor" | "cor_hex" | "peso_liquido_rolo_g">;
export interface OpcaoCliente {
  id: string;
  nome: string;
}

export interface Opcoes<T> {
  itens: T[];
  /** false = a pessoa não tem acesso ao módulo dono da lista (a tela explica). */
  acessivel: boolean;
}

export async function getOpcoesImpressoras(): Promise<Opcoes<OpcaoImpressora>> {
  const acesso = await getAcessoModulo("p3d_impressoras");
  if (!acesso) return { itens: [], acessivel: false };
  const { data } = await (await createClient())
    .from("p3d_impressoras")
    .select("id, nome, marca, modelo, potencia_media_kw, valor_aquisicao, valor_residual, vida_util_horas, manutencao_hora, manutencao_ciclo")
    .eq("workspace_id", acesso.workspaceId)
    .eq("ativo", true)
    .order("nome", { ascending: true });
  return { itens: (data ?? []) as unknown as OpcaoImpressora[], acessivel: true };
}

export async function getOpcoesMateriais(): Promise<Opcoes<OpcaoMaterial>> {
  const acesso = await getAcessoModulo("p3d_estoque");
  if (!acesso) return { itens: [], acessivel: false };
  const { data } = await (await createClient())
    .from("p3d_materiais")
    .select("id, nome, tipo, unidade, cor, cor_hex, peso_liquido_rolo_g")
    .eq("workspace_id", acesso.workspaceId)
    .eq("ativo", true)
    .order("nome", { ascending: true });
  return { itens: (data ?? []) as unknown as OpcaoMaterial[], acessivel: true };
}

export async function getOpcoesClientes(): Promise<Opcoes<OpcaoCliente>> {
  const acesso = await getAcessoModulo("clientes");
  if (!acesso) return { itens: [], acessivel: false };
  const { data } = await (await createClient())
    .from("clientes")
    .select("id, nome")
    .eq("workspace_id", acesso.workspaceId)
    .order("nome", { ascending: true });
  return { itens: (data ?? []) as OpcaoCliente[], acessivel: true };
}

export interface OpcaoFornecedor {
  id: string;
  nome: string;
  ativo: boolean;
}

/** Fornecedores para escolher em compras e no cadastro de material (módulo Fornecedores). */
export async function getOpcoesFornecedores(): Promise<Opcoes<OpcaoFornecedor>> {
  const acesso = await getAcessoModulo("p3d_fornecedores");
  if (!acesso) return { itens: [], acessivel: false };
  const { data } = await (await createClient())
    .from("p3d_fornecedores")
    .select("id, nome, ativo")
    .eq("workspace_id", acesso.workspaceId)
    .order("nome", { ascending: true });
  return { itens: (data ?? []) as OpcaoFornecedor[], acessivel: true };
}

export interface OpcaoProduto {
  id: string;
  nome: string;
  variacoes: { id: string; nome: string }[];
}

/** Produtos e variações para vincular a itens de pedido e a trabalhos (módulo Produtos). */
export async function getOpcoesProdutos(): Promise<Opcoes<OpcaoProduto>> {
  const acesso = await getAcessoModulo("p3d_produtos");
  if (!acesso) return { itens: [], acessivel: false };
  const supabase = await createClient();
  const [{ data: produtos }, { data: variacoes }] = await Promise.all([
    supabase.from("p3d_produtos").select("id, nome").eq("workspace_id", acesso.workspaceId).eq("ativo", true).order("nome", { ascending: true }),
    supabase.from("p3d_produto_variacoes").select("id, produto_id, nome").eq("workspace_id", acesso.workspaceId).eq("ativo", true).order("nome", { ascending: true }),
  ]);
  const vars = (variacoes ?? []) as { id: string; produto_id: string; nome: string }[];
  return {
    itens: ((produtos ?? []) as { id: string; nome: string }[]).map((p) => ({
      ...p,
      variacoes: vars.filter((v) => v.produto_id === p.id).map(({ id, nome }) => ({ id, nome })),
    })),
    acessivel: true,
  };
}

export interface OpcaoPedido {
  id: string;
  numero: number;
  status: string;
  cliente: string;
}

/** Pedidos para criar envios (módulo Pedidos). Nome do cliente: cadastrado (se visível) ou avulso. */
export async function getOpcoesPedidos(statusPermitidos?: readonly string[]): Promise<Opcoes<OpcaoPedido>> {
  const acesso = await getAcessoModulo("p3d_pedidos");
  if (!acesso) return { itens: [], acessivel: false };
  const supabase = await createClient();
  let consulta = supabase
    .from("p3d_pedidos")
    .select("id, numero, status, cliente_id, cliente_avulso")
    .eq("workspace_id", acesso.workspaceId)
    .order("numero", { ascending: false });
  if (statusPermitidos?.length) consulta = consulta.in("status", [...statusPermitidos]);
  const [{ data }, clientes] = await Promise.all([consulta, getOpcoesClientes()]);
  const nomes = new Map(clientes.itens.map((c) => [c.id, c.nome]));
  const linhas = (data ?? []) as { id: string; numero: number; status: string; cliente_id: string | null; cliente_avulso: string | null }[];
  return {
    itens: linhas.map((p) => ({
      id: p.id,
      numero: p.numero,
      status: p.status,
      cliente: p.cliente_id ? (nomes.get(p.cliente_id) ?? "Cliente cadastrado") : (p.cliente_avulso ?? "Sem cliente"),
    })),
    acessivel: true,
  };
}
