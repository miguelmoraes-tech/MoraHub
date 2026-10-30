/**
 * Auditoria do saldo de material: estoque_atual, custo_medio e ultimo_custo só mudam pelas RPCs de
 * movimentação (p3d_movimentar_estoque, p3d_registrar_entrada_material). Nenhuma tela ou action escreve
 * esses campos direto, em tabela nenhuma. Sem imports: serve ao script de auditoria e aos testes.
 */
export interface AchadoEstoque {
  regra: string;
  trecho: string;
}

function ateFechar(texto: string, inicio: number): string {
  let nivel = 1;
  let i = inicio;
  while (i < texto.length && nivel > 0) {
    if (texto[i] === "(") nivel++;
    else if (texto[i] === ")") nivel--;
    i++;
  }
  return texto.slice(inicio, i - 1);
}

const CAMPOS = /\b(estoque_atual|custo_medio|ultimo_custo)\s*:/;

export function achadosEstoqueDireto(texto: string): AchadoEstoque[] {
  const limpo = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const achados: AchadoEstoque[] = [];
  const re = /\.(insert|update|upsert)\s*\(/g;
  for (let m = re.exec(limpo); m; m = re.exec(limpo)) {
    const args = ateFechar(limpo, m.index + m[0].length);
    const campo = CAMPOS.exec(args);
    if (campo) {
      achados.push({ regra: `escrita direta em ${campo[1]} (só por p3d_movimentar_estoque / p3d_registrar_entrada_material)`, trecho: args.replace(/\s+/g, " ").slice(0, 80) });
    }
  }
  return achados;
}

/**
 * Totais em reais vêm do banco (p3d_materiais_resumo, p3d_resumo_investimento): a tela não soma
 * total_investido, valor_em_estoque nem custo × saldo.
 */
export function achadosTotaisNoCliente(texto: string): AchadoEstoque[] {
  const limpo = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const achados: AchadoEstoque[] = [];
  const regras: { regra: string; re: RegExp }[] = [
    { regra: "soma de total_investido/valor_em_estoque no cliente", re: /\.reduce\([^\n]*(total_investido|valor_em_estoque)/ },
    { regra: "valor em estoque calculado no cliente (saldo × custo)", re: /(estoque_atual|saldo)\w*\s*\*\s*[\w.]*custo_medio|custo_medio\s*\*\s*[\w.]*(estoque_atual|saldo)/ },
  ];
  for (const { regra, re } of regras) {
    const m = re.exec(limpo);
    if (m) achados.push({ regra, trecho: m[0].slice(0, 80) });
  }
  return achados;
}
