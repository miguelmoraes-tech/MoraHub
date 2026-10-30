"use client";

import { Download } from "lucide-react";
import { Aviso, Cartao, Vazio } from "@/components/impressao-3d/campos";
import { gerarCsv, nomeArquivoCsv, type ColunaCsv, type Periodo } from "@/lib/impressao-3d/painel";
import { TEXTO_GASTOS_POR_PESSOA, totaisGastos, type LinhaGastosComprador } from "@/lib/impressao-3d/comprador";
import { formatMoeda } from "@/lib/impressao-3d/numeros";

const TH = "py-1.5 pr-3 font-medium";
const THD = "py-1.5 pr-3 text-right font-medium";
const TD = "py-1.5 pr-3";
const TDD = "py-1.5 pr-3 text-right tabular-nums";

function baixarCsv(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const COLUNAS: ColunaCsv<LinhaGastosComprador>[] = [
  { titulo: "Pessoa", valor: (l) => l.nome },
  { titulo: "Materiais (R$)", valor: (l) => l.materiais },
  { titulo: "Equipamentos (R$)", valor: (l) => l.equipamentos },
  { titulo: "Total (R$)", valor: (l) => l.total },
];

/**
 * "Gastos por pessoa": quanto cada um pagou em materiais e em equipamentos no período (soma feita pelo
 * banco em p3d_gastos_por_comprador; a tela só mostra). Sem comprador = "Não informado".
 */
export function GastosPorPessoa({ linhas, periodo }: { linhas: LinhaGastosComprador[]; periodo: Periodo }) {
  const totais = totaisGastos(linhas);
  return (
    <Cartao
      titulo="Gastos por pessoa"
      acoes={
        <button
          type="button"
          onClick={() => baixarCsv(nomeArquivoCsv("gastos-por-pessoa", periodo), gerarCsv(COLUNAS, linhas))}
          disabled={linhas.length === 0}
          className="flex min-h-11 items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      }
    >
      <div className="mb-3 space-y-2">
        <Aviso>
          {TEXTO_GASTOS_POR_PESSOA} Materiais são as entradas de estoque com valor; equipamentos são impressoras e peças de desgaste.
          Compras sem comprador informado aparecem em &quot;Não informado&quot;.
        </Aviso>
      </div>
      {linhas.length === 0 ? (
        <Vazio>Nenhum gasto registrado no período.</Vazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className={TH}>Pessoa</th>
                <th className={THD}>Materiais</th>
                <th className={THD}>Equipamentos</th>
                <th className={THD}>Total</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {linhas.map((l) => (
                <tr key={`${l.comprador_user_id ?? "sem"}-${l.nome}`} className="border-t border-zinc-800/70">
                  <td className={TD}>{l.nome}</td>
                  <td className={TDD}>{formatMoeda(l.materiais)}</td>
                  <td className={TDD}>{formatMoeda(l.equipamentos)}</td>
                  <td className={`${TDD} font-medium text-zinc-100`}>{formatMoeda(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-700 font-medium text-zinc-100">
              <tr>
                <td className={TD}>Total do período</td>
                <td className={TDD}>{formatMoeda(totais.materiais)}</td>
                <td className={TDD}>{formatMoeda(totais.equipamentos)}</td>
                <td className={TDD}>{formatMoeda(totais.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Cartao>
  );
}
