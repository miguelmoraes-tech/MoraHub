/**
 * "Quem comprou" e "Data da compra" (Impressão 3D). Regras puras, sem React e sem banco: a tela e as
 * actions só montam o par comprador_user_id / comprador_nome a partir do seletor, validam a data e
 * mostram o resultado. Quem normaliza e confere (pessoa da empresa, 80 caracteres) é o banco.
 */
import { dataIsoValida, hojeSaoPaulo } from "@/lib/impressao-3d/datas";
import { num, numOuNull } from "@/lib/impressao-3d/painel";

/** Valor do seletor para "Outra pessoa (digitar nome)": grava só comprador_nome. */
export const COMPRADOR_OUTRO = "__outro__";
/** Valor do seletor para "Não informado": nenhum dos dois campos. */
export const COMPRADOR_NENHUM = "";
export const COMPRADOR_NOME_MAX = 80;
export const ROTULO_NAO_INFORMADO = "Não informado";

export interface PessoaComprador {
  id: string;
  nome: string;
  papel: string;
}

/** O par que vai para as tabelas e RPCs. null nos dois = sem comprador. */
export interface Comprador {
  comprador_user_id: string | null;
  comprador_nome: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PAPEL_COMPRADOR_ROTULO: Record<string, string> = {
  dono: "Fundador",
  cofundador: "Cofundador",
  socio: "Sócio",
  funcionario: "Funcionário",
};

/** Seletor → par (user_id, nome). Pessoa da lista grava só o id (o banco preenche o nome); "Outra pessoa" só o nome. */
export function montarComprador(seletor: unknown, nomeLivre: unknown): { comprador: Comprador } | { error: string } {
  const escolha = typeof seletor === "string" ? seletor.trim() : "";
  if (escolha === COMPRADOR_NENHUM) return { comprador: { comprador_user_id: null, comprador_nome: null } };

  if (escolha === COMPRADOR_OUTRO) {
    const nome = typeof nomeLivre === "string" ? nomeLivre.trim().replace(/\s+/g, " ") : "";
    if (!nome) return { error: "Quem comprou: digite o nome da pessoa." };
    if (nome.length > COMPRADOR_NOME_MAX) {
      return { error: `Quem comprou: use no máximo ${COMPRADOR_NOME_MAX} caracteres.` };
    }
    return { comprador: { comprador_user_id: null, comprador_nome: nome } };
  }

  if (!UUID.test(escolha)) return { error: "Quem comprou: escolha uma pessoa da lista." };
  return { comprador: { comprador_user_id: escolha.toLowerCase(), comprador_nome: null } };
}

/** Lê os campos do formulário ("comprador" e "comprador_nome") e monta o par. */
export function lerComprador(get: (campo: string) => FormDataEntryValue | null): { comprador: Comprador } | { error: string } {
  return montarComprador(get("comprador"), get("comprador_nome"));
}

/**
 * Data da compra: vazia = null (vale o padrão do banco, hoje); formato YYYY-MM-DD de calendário real;
 * nunca depois de hoje (America/Sao_Paulo). `hoje` existe para teste.
 */
export function validarDataCompra(valor: unknown, hoje: string = hojeSaoPaulo()): { data: string | null } | { error: string } {
  const bruto = typeof valor === "string" ? valor.trim() : "";
  if (!bruto) return { data: null };
  if (!dataIsoValida(bruto)) return { error: "Data da compra: informe uma data válida." };
  if (bruto > hoje) return { error: "Data da compra: não pode ser no futuro." };
  return { data: bruto };
}

/** Quem comprou + data da compra de um formulário (campos comprador, comprador_nome e `campoData`). */
export function lerCompra(
  get: (campo: string) => FormDataEntryValue | null,
  campoData = "data_compra",
  hoje?: string
): { comprador: Comprador; data: string | null } | { error: string } {
  const c = lerComprador(get);
  if ("error" in c) return c;
  const d = validarDataCompra(get(campoData), hoje);
  if ("error" in d) return d;
  return { comprador: c.comprador, data: d.data };
}

/** Seletor inicial: o usuário logado se ele estiver na lista; senão "Não informado". */
export function seletorInicial(userId: string | null | undefined, pessoas: readonly PessoaComprador[]): string {
  return userId && pessoas.some((p) => p.id === userId) ? userId : COMPRADOR_NENHUM;
}

/** Seletor de uma linha já gravada (edição): pessoa da lista, "Outra pessoa" (só nome) ou nenhum. */
export function seletorDeComprador(c: Partial<Comprador> | null | undefined, pessoas: readonly PessoaComprador[]): string {
  if (c?.comprador_user_id && pessoas.some((p) => p.id === c.comprador_user_id)) return c.comprador_user_id;
  if (c?.comprador_nome) return COMPRADOR_OUTRO;
  return COMPRADOR_NENHUM;
}

/** Texto para mostrar: o nome gravado; senão o da lista; senão "Não informado". */
export function rotuloComprador(
  c: Partial<Comprador> | null | undefined,
  pessoas: readonly PessoaComprador[] = []
): string {
  const nome = c?.comprador_nome?.trim();
  if (nome) return nome;
  const pessoa = c?.comprador_user_id ? pessoas.find((p) => p.id === c.comprador_user_id) : undefined;
  return pessoa?.nome || ROTULO_NAO_INFORMADO;
}

/** Resposta da RPC pessoas_da_empresa → lista do seletor (só papéis da equipe; vendedor fica de fora). */
export function lerPessoasCompradoras(bruto: unknown): PessoaComprador[] {
  if (!Array.isArray(bruto)) return [];
  const saida: PessoaComprador[] = [];
  for (const x of bruto) {
    if (!x || typeof x !== "object") continue;
    const p = x as Record<string, unknown>;
    const id = typeof p.pessoa_id === "string" ? p.pessoa_id : "";
    const papel = typeof p.papel === "string" ? p.papel : "";
    if (!UUID.test(id) || !(papel in PAPEL_COMPRADOR_ROTULO)) continue;
    const nome = typeof p.nome === "string" && p.nome.trim() ? p.nome.trim() : "Sem nome";
    saida.push({ id, nome, papel });
  }
  return saida;
}

/** Opção do seletor com o papel ao lado do nome. */
export function rotuloOpcaoPessoa(p: PessoaComprador): string {
  return `${p.nome} (${PAPEL_COMPRADOR_ROTULO[p.papel] ?? p.papel})`;
}

// --- Relatório "Gastos por pessoa" ----------------------------------------------------------------

export interface LinhaGastosComprador {
  comprador_user_id: string | null;
  /** Já com "Não informado" quando não há comprador. */
  nome: string;
  materiais: number;
  equipamentos: number;
  total: number;
}

/** Resposta de p3d_gastos_por_comprador. Total vem do banco; se faltar, é materiais + equipamentos só para exibir. */
export function lerGastosPorComprador(bruto: unknown): LinhaGastosComprador[] {
  if (!Array.isArray(bruto)) return [];
  const saida: LinhaGastosComprador[] = [];
  for (const x of bruto) {
    if (!x || typeof x !== "object") continue;
    const l = x as Record<string, unknown>;
    const materiais = num(l.materiais);
    const equipamentos = num(l.equipamentos);
    const nome = typeof l.comprador_nome === "string" && l.comprador_nome.trim() ? l.comprador_nome.trim() : ROTULO_NAO_INFORMADO;
    saida.push({
      comprador_user_id: typeof l.comprador_user_id === "string" ? l.comprador_user_id : null,
      nome,
      materiais,
      equipamentos,
      total: numOuNull(l.total) ?? materiais + equipamentos,
    });
  }
  return saida;
}

/** Totais da tabela (soma das linhas que o banco devolveu). */
export function totaisGastos(linhas: readonly LinhaGastosComprador[]): { materiais: number; equipamentos: number; total: number } {
  return linhas.reduce(
    (t, l) => ({ materiais: t.materiais + l.materiais, equipamentos: t.equipamentos + l.equipamentos, total: t.total + l.total }),
    { materiais: 0, equipamentos: 0, total: 0 }
  );
}

export const TEXTO_GASTOS_POR_PESSOA = "Serve para acertar quem pagou o quê entre os sócios.";
