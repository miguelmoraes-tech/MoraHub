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
];
