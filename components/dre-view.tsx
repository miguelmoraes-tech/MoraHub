"use client";

import { useMemo, useState } from "react";
import { FileBarChart, Filter } from "lucide-react";
import type { Comprovante, Gasto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { computeDre } from "@/lib/dre/compute";
import { monthRange } from "@/lib/pessoal/period";
import { todayISO } from "@/lib/vencimentos/dates";
import { ExportButton } from "@/components/export-button";

export interface DreConta {
  donoId: string;
  nome: string;
}

export type GastoComConta = Gasto & { donoId: string; donoNome?: string };
export type ComprovanteComConta = Comprovante & { donoId: string; donoNome?: string };

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500";

export function DreView({
  gastos,
  comprovantes,
  contas,
  exportBasePath,
}: {
  gastos: GastoComConta[];
  comprovantes: ComprovanteComConta[];
  contas?: DreConta[];
  exportBasePath: string;
}) {
  const mesAtual = todayISO().slice(0, 7);
  const [inicio, setInicio] = useState(mesAtual);
  const [fim, setFim] = useState(mesAtual);
  const [contaId, setContaId] = useState("");

  const { start, end } = useMemo(() => {
    const [anoInicio, mesInicio] = inicio.split("-").map(Number);
    const [anoFim, mesFim] = fim.split("-").map(Number);
    return {
      start: monthRange(anoInicio, mesInicio).start,
      end: monthRange(anoFim, mesFim).end,
    };
  }, [inicio, fim]);

  const gastosFiltrados = useMemo(
    () =>
      gastos.filter(
        (g) => g.data >= start && g.data <= end && (!contaId || g.donoId === contaId)
      ),
    [gastos, start, end, contaId]
  );
  const comprovantesFiltrados = useMemo(
    () =>
      comprovantes.filter(
        (c) => c.data && c.data >= start && c.data <= end && (!contaId || c.donoId === contaId)
      ),
    [comprovantes, start, end, contaId]
  );

  const dre = useMemo(
    () => computeDre(gastosFiltrados, comprovantesFiltrados),
    [gastosFiltrados, comprovantesFiltrados]
  );

  const exportHref = `${exportBasePath}?start=${start}&end=${end}${
    contaId ? `&donoId=${contaId}` : ""
  }`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            DRE — Demonstração de Resultado
          </h1>
          <p className="text-sm text-zinc-500">
            Receita, despesas por categoria e resultado do período.
          </p>
        </div>
        <ExportButton href={exportHref} />
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">De</label>
          <input
            type="month"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Até</label>
          <input
            type="month"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className={inputClass}
          />
        </div>
        {contas && contas.length > 1 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 outline-none"
            >
              <option value="" className="bg-zinc-900">
                Todas as contas
              </option>
              {contas.map((c) => (
                <option key={c.donoId} value={c.donoId} className="bg-zinc-900">
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FileBarChart className="h-4 w-4 text-zinc-500" />
          Resultado do período
        </div>

        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-zinc-800/80">
              <td className="py-2 text-zinc-300">Receita</td>
              <td className="py-2 text-right font-medium text-emerald-300">
                {formatCurrency(dre.receita)}
              </td>
            </tr>

            <tr>
              <td
                colSpan={2}
                className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-600"
              >
                Despesas
              </td>
            </tr>
            {dre.despesas.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-1.5 text-xs text-zinc-600">
                  Nenhuma despesa no período.
                </td>
              </tr>
            ) : (
              dre.despesas.map((d) => (
                <tr key={d.categoria} className="border-b border-zinc-800/50">
                  <td className="py-1.5 pl-3 text-zinc-400">{d.categoria}</td>
                  <td className="py-1.5 text-right text-rose-300">
                    {formatCurrency(d.valor)}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-b border-zinc-800/80">
              <td className="py-2 pl-3 text-zinc-300">Total de despesas</td>
              <td className="py-2 text-right font-medium text-rose-300">
                {formatCurrency(dre.totalDespesas)}
              </td>
            </tr>

            <tr className="border-b border-zinc-800/80">
              <td className="pt-3 pb-1 font-semibold text-zinc-100">Resultado do período</td>
              <td
                className={`pt-3 pb-1 text-right text-base font-semibold ${
                  dre.resultado >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(dre.resultado)}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-xs text-zinc-500">Margem</td>
              <td className="py-1 text-right text-xs text-zinc-400">
                {dre.margem === null ? "—" : `${dre.margem.toFixed(1)}%`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Relatório gerencial em regime de caixa, baseado no que foi lançado no sistema — não
        substitui a DRE oficial preparada pelo contador para fins fiscais/societários.
      </p>
    </div>
  );
}
