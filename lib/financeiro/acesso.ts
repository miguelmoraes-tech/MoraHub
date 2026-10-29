import { getAcessoModulo, temExtra, type AcessoModulo } from "@/lib/empresa-ativa";
import { permissoesFinanceiro } from "@/lib/financeiro/permissoes";

/**
 * O que a pessoa pode fazer no Financeiro da empresa ativa. `valores` é o extra
 * "Ver valores" (fundador/cofundador sempre têm). Sem ele a tela não mostra
 * valores nem saldos, e também não deixa criar/editar (não se edita o que não
 * se vê). O RLS é a barreira real; isto é interface e mensagem clara.
 */
export interface AcessoFinanceiro {
  acesso: AcessoModulo;
  workspaceId: string;
  valores: boolean;
  /** Nível leitura, ou sem "valores": esconde criar/editar/excluir. */
  somenteLeitura: boolean;
}

export async function getAcessoFinanceiro(): Promise<AcessoFinanceiro | null> {
  const acesso = await getAcessoModulo("financeiro");
  if (!acesso) return null;
  return { acesso, workspaceId: acesso.workspaceId, ...permissoesFinanceiro(acesso) };
}

/** Guarda das actions de escrita do Financeiro: edição + "valores". Falha = null. */
export async function getAcessoFinanceiroEdicao(): Promise<AcessoModulo | null> {
  const acesso = await getAcessoModulo("financeiro", "edicao");
  return acesso && temExtra(acesso, "valores") ? acesso : null;
}

/**
 * Leituras auxiliares de outros módulos (clientes, leads/propostas): a pessoa
 * só lê o que o próprio módulo dela libera. `null` = sem acesso: a tela mostra "—".
 */
export async function getAuxiliaresFinanceiro(): Promise<{
  clientes: AcessoModulo | null;
  leads: AcessoModulo | null;
}> {
  const [clientes, leads] = await Promise.all([getAcessoModulo("clientes"), getAcessoModulo("leads")]);
  return { clientes, leads };
}
