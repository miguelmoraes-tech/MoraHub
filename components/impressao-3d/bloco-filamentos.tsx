"use client";

import { FilamentosLista, type OpcaoFilamento } from "@/components/impressao-3d/filamentos-lista";
import {
  BASE_GRAMAS_ROTULO, custosPorLinha, resumoPesos, type BaseGramas, type FaltaDeEstoque, type LinhaFilamento,
  type MaterialEntrada,
} from "@/lib/impressao-3d/filamentos";
import type { ItemMaterialCalculo } from "@/lib/impressao-3d/calculo";
import { formatNumero } from "@/lib/impressao-3d/numeros";

/**
 * "Filamentos usados neste projeto": o bloco ÚNICO da Calculadora de preço, do simulador avançado e do
 * orçamento. Uma linha por filamento (do estoque ou informado na hora) com as gramas, a chave "As gramas
 * são: por peça | do projeto todo", o custo de cada filamento (devolvido pelo banco em
 * calculo.detalhes.material.itens) e o total de gramas. Só coleta dados: preço e saldo vêm do servidor.
 */
export function BlocoFilamentos({
  linhas,
  aoMudarLinhas,
  base,
  aoMudarBase,
  quantidade,
  opcoes,
  estoqueAcessivel,
  materiais,
  linhaIds,
  itensCusto,
  faltas,
  ajudaPeso,
  comTempo = false,
}: {
  linhas: LinhaFilamento[];
  aoMudarLinhas: (linhas: LinhaFilamento[]) => void;
  base: BaseGramas;
  aoMudarBase: (base: BaseGramas) => void;
  /** Quantidade de peças do lote (1 se inválida). */
  quantidade: number;
  opcoes: OpcaoFilamento[];
  estoqueAcessivel: boolean;
  /** O que vai em p_entrada.materiais (lote), para o resumo de gramas. */
  materiais: readonly MaterialEntrada[];
  linhaIds: readonly string[];
  /** Custo por filamento do último cálculo (null/vazio antes de calcular). */
  itensCusto: readonly ItemMaterialCalculo[] | null;
  faltas: FaltaDeEstoque[];
  ajudaPeso?: string;
  /** A chave também vale para o tempo de impressão (calculadora rápida). */
  comTempo?: boolean;
}) {
  const custos = custosPorLinha(linhaIds, itensCusto ?? []);
  const pesos = resumoPesos(materiais, quantidade);
  const q = Number.isInteger(quantidade) && quantidade > 0 ? quantidade : 1;

  return (
    <fieldset className="space-y-3" aria-label="Filamentos usados neste projeto">
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Filamentos usados neste projeto</legend>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium text-zinc-400">As gramas{comTempo ? " e o tempo" : ""} são:</span>
        <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {(Object.keys(BASE_GRAMAS_ROTULO) as BaseGramas[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => aoMudarBase(k)}
              aria-pressed={base === k}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${base === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {k === "peca" ? "Por peça" : "Do projeto todo"}
            </button>
          ))}
        </div>
      </div>

      <FilamentosLista
        linhas={linhas}
        aoMudar={aoMudarLinhas}
        opcoes={opcoes}
        estoqueAcessivel={estoqueAcessivel}
        rotuloPeso={base === "peca" ? "Gramas por peça" : "Gramas do projeto todo"}
        ajudaPeso={ajudaPeso}
        faltas={faltas}
        custos={custos}
      />

      {pesos.lote > 0 && (
        <p className="text-xs text-zinc-500" aria-live="polite">
          Total no projeto: {formatNumero(pesos.lote, 1)} g
          {base === "peca" && q > 1 ? ` (${formatNumero(pesos.porPeca, 1)} g por peça × ${q} peças)` : ""}.
        </p>
      )}
    </fieldset>
  );
}
