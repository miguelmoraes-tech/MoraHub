import { LineChart } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface FluxoCaixaMes {
  label: string;
  totalPagar: number;
  totalReceber: number;
  saldoMes: number;
  saldoAcumulado: number;
}

export function FluxoCaixaView({ meses }: { meses: FluxoCaixaMes[] }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">
          Fluxo de Caixa Projetado
        </h1>
        <p className="text-sm text-zinc-500">
          Contas a pagar e a receber em aberto, mês a mês — o saldo acumulado
          é uma projeção relativa (parte de zero, não do saldo real em caixa).
          Valores vencidos e não quitados entram no mês atual.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <LineChart className="h-4 w-4 text-zinc-500" />
          Projeção dos próximos meses
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                <th className="px-2 pb-1">Período</th>
                <th className="px-2 pb-1 text-right">A pagar</th>
                <th className="px-2 pb-1 text-right">A receber</th>
                <th className="px-2 pb-1 text-right">Saldo do mês</th>
                <th className="px-2 pb-1 text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((mes) => (
                <tr
                  key={mes.label}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-950/40"
                >
                  <td className="rounded-l-lg px-2 py-2 text-zinc-200">
                    {mes.label}
                  </td>
                  <td className="px-2 py-2 text-right text-rose-300">
                    {formatCurrency(mes.totalPagar)}
                  </td>
                  <td className="px-2 py-2 text-right text-emerald-300">
                    {formatCurrency(mes.totalReceber)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-medium ${
                      mes.saldoMes < 0 ? "text-rose-300" : "text-zinc-200"
                    }`}
                  >
                    {formatCurrency(mes.saldoMes)}
                  </td>
                  <td
                    className={`rounded-r-lg px-2 py-2 text-right font-semibold ${
                      mes.saldoAcumulado < 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {formatCurrency(mes.saldoAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
