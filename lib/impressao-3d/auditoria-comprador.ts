/**
 * Regras de auditoria do "Quem comprou". Sem imports: serve ao script de auditoria (node puro) e aos testes.
 *  1. Compra de material entra por p3d_registrar_entrada_material (leva comprador e data). A RPC
 *     p3d_movimentar_estoque fica para ajuste, perda e demais tipos: nunca com tipo "entrada".
 *  2. Os campos de comprador de p3d_movimentos_estoque (comprador_user_id, comprador_nome, data_compra)
 *     são somente leitura: só mudam por p3d_corrigir_comprador.
 */

export interface AchadoComprador {
  regra: string;
  trecho: string;
}

/** Texto entre os parênteses que abrem em `inicio` (logo depois do "("). */
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

export function achadosComprador(texto: string): AchadoComprador[] {
  const limpo = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const achados: AchadoComprador[] = [];

  // 1) p3d_movimentar_estoque com tipo "entrada".
  const reRpc = /\.rpc\(\s*["']p3d_movimentar_estoque["']/g;
  for (let m = reRpc.exec(limpo); m; m = reRpc.exec(limpo)) {
    const chamada = ateFechar(limpo, m.index + m[0].length);
    if (/p_tipo\s*:\s*["']entrada["']/.test(chamada)) {
      achados.push({ regra: "compra de material por p3d_movimentar_estoque (use p3d_registrar_entrada_material)", trecho: chamada.replace(/\s+/g, " ").slice(0, 80) });
    } else if (/p_tipo\s*:\s*tipo\b/.test(chamada) && !/p3d_registrar_entrada_material/.test(limpo)) {
      // Tipo vindo de variável: o arquivo precisa ter o caminho da entrada pela RPC nova.
      achados.push({ regra: "p3d_movimentar_estoque com tipo variável sem desviar a entrada para p3d_registrar_entrada_material", trecho: "p_tipo: tipo" });
    }
  }

  // 2) escrita direta em p3d_movimentos_estoque (comprador é somente leitura).
  const reEscrita = /\.from\(\s*["']p3d_movimentos_estoque["']\s*\)\s*\.(insert|update|upsert)\s*\(/g;
  for (let m = reEscrita.exec(limpo); m; m = reEscrita.exec(limpo)) {
    const args = ateFechar(limpo, m.index + m[0].length);
    achados.push({
      regra: /comprador_|data_compra/.test(args)
        ? "escrita direta em campo de comprador de p3d_movimentos_estoque (use p3d_corrigir_comprador)"
        : "escrita direta em p3d_movimentos_estoque (somente leitura)",
      trecho: args.replace(/\s+/g, " ").slice(0, 80),
    });
  }
  return achados;
}
