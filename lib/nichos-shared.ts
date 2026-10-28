/** Nichos e modelos (catálogo no banco), no formato que as telas usam. Sem dependência de servidor. */

export interface ModeloNicho {
  chave: string;
  nome: string;
  descricao: string | null;
}

export interface NichoCatalogo {
  chave: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  /** Módulos recomendados, na ordem de nicho_modulos.ordem (chave + nome do catálogo). */
  modulos: { chave: string; nome: string }[];
  modelos: ModeloNicho[];
}

/** "Vamos ligar: Clientes, Agenda e Financeiro". */
export function resumoModulos(nomes: readonly string[]): string {
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** Mensagem para o erro de aplicar_nicho/criar_empresa/salvar_rotulos (os textos vêm do RAISE do banco). */
export function erroDeNicho(message: string | undefined): string {
  if (!message) return "Não foi possível concluir. Tente novamente.";
  if (message.includes("Nicho inválido")) return "Esse tipo de negócio não está disponível.";
  if (message.includes("Modelo inválido")) return "Esse modelo não está disponível para o tipo de negócio escolhido.";
  if (message.includes("Sem permissão")) return "Só o dono ou cofundador da empresa pode fazer isso.";
  if (message.includes("Use de 1 a 40")) return "Use de 1 a 40 caracteres nos nomes das telas.";
  if (message.includes("inválid")) return "Dados inválidos. Revise os nomes e tente novamente.";
  return "Não foi possível concluir. Tente novamente.";
}
