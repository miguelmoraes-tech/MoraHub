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
