import { getAcessoModulo, type AcessoModulo } from "@/lib/empresa-ativa";
import { permissoesJuridico } from "@/lib/juridico-shared";

/**
 * Acesso às telas do Jurídico na empresa ativa. Processos, compliance e
 * propriedade intelectual são organizados por CLIENTE: o nome do cliente é uma
 * leitura auxiliar (módulo Clientes) e os formulários dependem da lista de
 * clientes, então sem acesso a Clientes essas telas viram só leitura e os
 * nomes aparecem como "—". Modelos de contrato não dependem de cliente.
 */
export interface AcessoJuridico {
  acesso: AcessoModulo;
  workspaceId: string;
  /** Acesso de leitura a Clientes (nomes), ou null: a tela mostra "—". */
  clientes: AcessoModulo | null;
  /** Leitura, ou sem Clientes: esconde criar/editar/excluir nas telas por cliente. */
  somenteLeituraPorCliente: boolean;
  /** Só o nível: esconde criar/editar/excluir nos modelos de contrato. */
  somenteLeitura: boolean;
}

export async function getAcessoJuridico(): Promise<AcessoJuridico | null> {
  const [acesso, clientes] = await Promise.all([
    getAcessoModulo("juridico"),
    getAcessoModulo("clientes"),
  ]);
  if (!acesso) return null;
  return {
    acesso,
    workspaceId: acesso.workspaceId,
    clientes,
    ...permissoesJuridico(acesso.nivel, !!clientes),
  };
}

/** Escrita nas telas por cliente: edição em Jurídico E acesso a Clientes. Falha = null. */
export async function getAcessoJuridicoEdicaoComClientes(): Promise<AcessoModulo | null> {
  const [acesso, clientes] = await Promise.all([
    getAcessoModulo("juridico", "edicao"),
    getAcessoModulo("clientes"),
  ]);
  return acesso && clientes ? acesso : null;
}
