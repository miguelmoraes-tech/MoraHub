/**
 * Mensagens de erro do banco para o usuário. As RPCs p3d_* levantam textos
 * claros em português: são mostrados como vieram. Escritas diretas ganham um
 * texto por tipo de violação (o `padrao` cobre o resto).
 */
interface ErroBanco {
  message?: string;
  code?: string;
}

/** Erro de RPC: o texto do banco já é a mensagem para o usuário. */
export function mensagemRpc(erro: ErroBanco | null | undefined, padrao: string): string {
  const texto = erro?.message?.trim();
  return texto ? texto : padrao;
}

/** Erro de insert/update/delete direto. */
export function mensagemEscrita(erro: ErroBanco | null | undefined, padrao: string): string {
  switch (erro?.code) {
    case "23505":
      return "Já existe um registro com esse valor (por exemplo, o mesmo SKU).";
    case "23503":
      return "Há registros ligados a este item. Arquive em vez de excluir.";
    case "42501":
      return "Você não tem permissão para fazer isso.";
    case "23514":
      return `${padrao} Algum valor está fora do permitido.`;
    default:
      return padrao;
  }
}
