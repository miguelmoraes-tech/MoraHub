import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { RentabilidadeResumo } from "@/lib/rentabilidade";

function formatMargem(margem: number | null) {
  if (margem === null) return "—";
  return `${(margem * 100).toFixed(1)}%`;
}

export function RentabilidadeClienteCard({
  rentabilidade,
}: {
  rentabilidade: RentabilidadeResumo;
}) {
  const { receita, custo, lucro, margem } = rentabilidade;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <TrendingUp className="h-4 w-4 text-zinc-500" />
        Rentabilidade
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-zinc-500">Receita</p>
          <p className="text-lg font-semibold text-emerald-400">
            {formatCurrency(receita)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Custo</p>
          <p className="text-lg font-semibold text-rose-400">
            {formatCurrency(custo)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Lucro</p>
          <p
            className={`text-lg font-semibold ${
              lucro >= 0 ? "text-zinc-100" : "text-rose-400"
            }`}
          >
            {formatCurrency(lucro)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Margem</p>
          <p
            className={`text-lg font-semibold ${
              margem === null
                ? "text-zinc-500"
                : margem >= 0
                  ? "text-zinc-100"
                  : "text-rose-400"
            }`}
          >
            {formatMargem(margem)}
          </p>
        </div>
      </div>
    </div>
  );
}
