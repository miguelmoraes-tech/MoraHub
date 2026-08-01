import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { RentabilidadeCliente } from "@/lib/rentabilidade";

function formatMargem(margem: number | null) {
  if (margem === null) return "—";
  return `${(margem * 100).toFixed(1)}%`;
}

function RankingChart({ ranking }: { ranking: RentabilidadeCliente[] }) {
  const max = Math.max(1, ...ranking.map((r) => Math.abs(r.lucro)));

  return (
    <div className="space-y-2.5">
      {ranking.map((item, index) => (
        <div key={item.clienteId} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-xs text-zinc-600">
            {index + 1}
          </span>
          <span className="w-28 shrink-0 truncate text-xs text-zinc-400 sm:w-36">
            {item.clienteNome}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${
                item.lucro >= 0 ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ width: `${(Math.abs(item.lucro) / max) * 100}%` }}
            />
          </div>
          <span
            className={`w-24 shrink-0 text-right text-xs font-medium ${
              item.lucro >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(item.lucro)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RentabilidadeBoard({
  ranking,
}: {
  ranking: RentabilidadeCliente[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">
          Rentabilidade por cliente
        </h1>
        <p className="text-sm text-zinc-500">
          Receita (comprovantes) menos custo (gastos atribuídos ao cliente),
          do mais lucrativo para o menos — use para priorizar onde investir
          esforço.
        </p>
      </div>

      {ranking.length > 0 ? (
        <>
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <TrendingUp className="h-4 w-4 text-zinc-500" />
              Ranking de lucro
            </div>
            <RankingChart ranking={ranking} />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <TrendingUp className="h-4 w-4 text-zinc-500" />
              Detalhado
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    <th className="px-2 pb-1">Cliente</th>
                    <th className="px-2 pb-1 text-right">Receita</th>
                    <th className="px-2 pb-1 text-right">Custo</th>
                    <th className="px-2 pb-1 text-right">Lucro</th>
                    <th className="px-2 pb-1 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item) => (
                    <tr
                      key={item.clienteId}
                      className="rounded-lg border border-zinc-800/80 bg-zinc-950/40"
                    >
                      <td className="rounded-l-lg px-2 py-2 text-zinc-200">
                        <Link
                          href={`/clientes/${item.clienteId}`}
                          className="hover:text-copper-400"
                        >
                          {item.clienteNome}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right text-emerald-300">
                        {formatCurrency(item.receita)}
                      </td>
                      <td className="px-2 py-2 text-right text-rose-300">
                        {formatCurrency(item.custo)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-medium ${
                          item.lucro >= 0 ? "text-zinc-200" : "text-rose-300"
                        }`}
                      >
                        {formatCurrency(item.lucro)}
                      </td>
                      <td className="rounded-r-lg px-2 py-2 text-right text-zinc-400">
                        {formatMargem(item.margem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-600">
            Nenhum cliente com receita ou custo registrado ainda.
          </p>
        </div>
      )}
    </div>
  );
}
