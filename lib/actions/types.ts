/**
 * `pendente: true` = a empresa tem 2+ fundadores e a alteração foi só ENVIADA
 * para aprovação (nada mudou ainda): a tela mostra o aviso e relê o servidor,
 * sem atualizar nada como se tivesse executado.
 */
export type ActionState =
  | { error: string }
  | {
      ok: true;
      pendente?: boolean;
      /** Quantos pedidos de aprovação foram criados (ex.: "Adicionar recomendados" = um por módulo). */
      pedidos?: number;
    }
  | undefined;
