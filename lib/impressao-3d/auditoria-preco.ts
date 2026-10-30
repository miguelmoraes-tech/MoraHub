/**
 * Padrões que denunciam PREÇO calculado no cliente. A Calculadora de preço só monta a entrada e
 * mostra o retorno de p3d_simular_preco; custo × multiplicador, custo ÷ (1 − margem) e afins
 * pertencem à RPC. Sem imports: serve ao script de auditoria (node puro) e aos testes.
 */
export const PADROES_PRECO_NO_CLIENTE: { nome: string; re: RegExp }[] = [
  { nome: "custo × multiplicador/markup", re: /custo[\w.[\]]*\s*\*\s*\(?\s*[\w.]*(multiplicador|markup|mult)\b/i },
  { nome: "multiplicador/markup × custo", re: /(multiplicador|markup|mult)[\w.]*\s*\*\s*\(?\s*[\w.]*custo/i },
  { nome: "custo ÷ (1 − margem)", re: /custo[\w.[\]]*\s*\/\s*\(\s*1\s*-/i },
  { nome: "custo × (1 + markup)", re: /custo[\w.[\]]*\s*\*\s*\(\s*1\s*\+/i },
  { nome: "preço atribuído por multiplicação", re: /\b(preco|preço)\w*\s*=\s*[^;=]*\*/i },
  { nome: "conta em cima do preço devolvido", re: /(preco_final|preco_recomendado|por_unidade\.preco)\s*[*/+-]/ },
  { nome: "lucro/margem recalculados", re: /(lucro|margem_real|markup_real)\s*=\s*[^;=]*[-*/]/ },
];

/** Nomes dos padrões encontrados no texto (sem comentários); vazio = limpo. */
export function precoCalculadoNoCliente(texto: string): string[] {
  const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return PADROES_PRECO_NO_CLIENTE.filter(({ re }) => re.test(semComentarios)).map(({ nome }) => nome);
}

/** Arquivos da calculadora rápida que não podem calcular preço. */
export const ARQUIVOS_CALCULADORA_RAPIDA = [
  "components/impressao-3d/calculadora-rapida.tsx",
  "lib/impressao-3d/calculadora-rapida.ts",
  // Montam as linhas de filamento da entrada; só convertem unidade (valor do kg ÷ 1000), nunca preço.
  "components/impressao-3d/filamentos-lista.tsx",
  "components/impressao-3d/bloco-filamentos.tsx",
  "lib/impressao-3d/filamentos.ts",
];

/**
 * Padrões que denunciam SALDO de estoque calculado no cliente. Saldo e custo médio (material e peças)
 * só mudam pelas RPCs e a tela mostra o que o banco devolveu.
 */
export const PADROES_SALDO_NO_CLIENTE: { nome: string; re: RegExp }[] = [
  { nome: "saldo atribuído por conta", re: /\b(saldoApos|saldo_apos|estoque_atual|estoqueAtual|emEstoque|saldoPecas|saldoMaterial)\w*\s*(\+=|-=|=)\s*[^;=]*[+\-*]\s*\w/ },
  { nome: "quantidade da peça somada/subtraída", re: /\b(peca|p|item)\.(quantidade|estoque_atual)\s*(\+=|-=)/ },
  { nome: "saldo após = saldo ± delta", re: /saldo\w*\s*[+-]\s*[\w.]*delta/i },
];

/** Nomes dos padrões de saldo encontrados (sem comentários). */
export function saldoCalculadoNoCliente(texto: string): string[] {
  const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return PADROES_SALDO_NO_CLIENTE.filter(({ re }) => re.test(semComentarios)).map(({ nome }) => nome);
}

/** Telas do estoque de material/peças, produção e pedidos: não recalculam saldo. */
export const ARQUIVOS_SEM_SALDO_NO_CLIENTE = [
  "components/impressao-3d/estoque-board.tsx",
  "components/impressao-3d/pecas-estoque.tsx",
  "components/impressao-3d/producao-board.tsx",
  "components/impressao-3d/pedido-detalhe.tsx",
  "components/impressao-3d/filamentos-lista.tsx",
  "components/impressao-3d/bloco-filamentos.tsx",
  "lib/impressao-3d/pecas.ts",
  "lib/impressao-3d/filamentos.ts",
];
