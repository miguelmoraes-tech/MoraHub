import type { AcessoModulo } from "@/lib/empresa-ativa";

/**
 * Extra "Ver salários e folha" do módulo RH (modulos.permissoes_extras).
 *
 * ATENÇÃO: é só de TELA. Esconde salário, folha, benefícios em valor e qualquer
 * campo monetário do RH e faz as actions recusarem esses valores, mas NÃO é
 * barreira de banco: o RLS de quem tem RH (leitura/edição) não distingue colunas.
 * Fundador e cofundador sempre têm o extra (temExtra).
 */
export const EXTRA_SALARIOS = "salarios";

export const SEM_PERMISSAO_SALARIOS = "Você não tem permissão para ver ou alterar salários e valores.";

/** Pura (testável): o acesso vê/edita valores monetários do RH? */
export function podeVerSalarios(acesso: { ehDono: boolean; extras: readonly string[] }): boolean {
  return acesso.ehDono || acesso.extras.includes(EXTRA_SALARIOS);
}

/**
 * Quem não tem o extra não pode enviar valor monetário (a tela nem mostra o
 * campo; valor enviado = tentativa de contornar). Devolve a mensagem de erro
 * ou null se pode seguir.
 */
export function erroValorSemPermissao(
  acesso: Pick<AcessoModulo, "ehDono" | "extras">,
  valorEnviado: unknown
): string | null {
  if (podeVerSalarios(acesso)) return null;
  const vazio = valorEnviado === undefined || valorEnviado === null || valorEnviado === "";
  return vazio ? null : SEM_PERMISSAO_SALARIOS;
}

export const AVISO_ATIVE_FINANCEIRO = "Ative o módulo Financeiro para gerar folha.";
export const AVISO_SEM_FINANCEIRO =
  "A folha vira contas a pagar: você precisa de edição no Financeiro (com “Ver valores”) além do RH. Nada foi gerado.";

/**
 * A folha escreve em contas_pagar, então exige edição no RH E no Financeiro
 * (módulo ligado), além do extra de salários. Devolve a mensagem de recusa ou
 * null. Pura: as actions passam o que o guard devolveu; nunca gera parcialmente.
 */
export function motivoNegarFolha(e: {
  rh: Pick<AcessoModulo, "ehDono" | "extras"> | null;
  financeiroLigado: boolean;
  financeiroEdicao: unknown | null;
  /** Folha já vinculada a uma conta a pagar (atualizar/excluir) ou geração nova. */
  tocaContasPagar: boolean;
}): string | null {
  if (!e.rh) return "Você não tem permissão para fazer isso.";
  if (!podeVerSalarios(e.rh)) return SEM_PERMISSAO_SALARIOS;
  if (!e.tocaContasPagar) return null;
  if (!e.financeiroLigado) return AVISO_ATIVE_FINANCEIRO;
  if (!e.financeiroEdicao) return AVISO_SEM_FINANCEIRO;
  return null;
}
