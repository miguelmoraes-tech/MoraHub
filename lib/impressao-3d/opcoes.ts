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
