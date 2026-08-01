import { LineChart, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface FluxoCaixaMes {
  label: string;
  contasReceber: number;
  assinaturas: number;
  contasPagar: number;
  gastosFixos: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoMes: number;
  saldoAcumulado: number;
}

function EntradasSaidasChart({ meses }: { meses: FluxoCaixaMes[] }) {
  const max = Math.max(
    1,
    ...meses.map((m) => Math.max(m.totalEntradas, m.totalSaidas))
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Saídas
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {meses.map((mes) => (
          <div key={mes.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {mes.saldoMes < 0 && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            )}
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-full max-w-6 rounded-t bg-emerald-500"
                style={{
                  height: `${Math.max(2, (mes.totalEntradas / max) * 100)}%`,
                }}
                title={`Entradas: ${formatCurrency(mes.totalEntradas)}`}
              />
              <div
                className="w-full max-w-6 rounded-t bg-rose-500"
                style={{
                  height: `${Math.max(2, (mes.totalSaidas / max) * 100)}%`,
                }}
                title={`Saídas: ${formatCurrency(mes.totalSaidas)}`}
              />
            </div>
            <span className="truncate text-[11px] text-zinc-500">
              {mes.label.split("/")[0].slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FluxoCaixaView({ meses }: { meses: FluxoCaixaMes[] }) {
  const algumNegativo = meses.some((m) => m.saldoMes < 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">
          Fluxo de Caixa Projetado
        </h1>
        <p className="text-sm text-zinc-500">
          Entradas (contas a receber + assinaturas ativas) e saídas (contas a
          pagar + gastos fixos) projetadas mês a mês, a partir do mês atual.
        </p>
      </div>

      {algumNegativo && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2.5 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          Um ou mais meses têm saldo projetado negativo — veja o detalhe
          abaixo.
        </div>
      )}

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <LineChart className="h-4 w-4 text-zinc-500" />
          Entradas vs. saídas por mês
        </div>
        <EntradasSaidasChart meses={meses} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <LineChart className="h-4 w-4 text-zinc-500" />
          Projeção detalhada
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-1.5 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                <th className="px-2 pb-1">Período</th>
                <th className="px-2 pb-1 text-right">Entradas</th>
                <th className="px-2 pb-1 text-right">Saídas</th>
                <th className="px-2 pb-1 text-right">Saldo do mês</th>
                <th className="px-2 pb-1 text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((mes) => (
                <tr
                  key={mes.label}
                  className={`rounded-lg border bg-zinc-950/40 ${
                    mes.saldoMes < 0
                      ? "border-rose-900/50"
                      : "border-zinc-800/80"
                  }`}
                >
                  <td className="rounded-l-lg px-2 py-2 text-zinc-200">
                    <span className="flex items-center gap-1.5">
                      {mes.saldoMes < 0 && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      )}
                      {mes.label}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right text-emerald-300">
                    {formatCurrency(mes.totalEntradas)}
                    <p className="text-[11px] font-normal text-zinc-600">
                      {formatCurrency(mes.contasReceber)} a receber +{" "}
                      {formatCurrency(mes.assinaturas)} assinaturas
                    </p>
                  </td>
                  <td className="px-2 py-2 text-right text-rose-300">
                    {formatCurrency(mes.totalSaidas)}
                    <p className="text-[11px] font-normal text-zinc-600">
                      {formatCurrency(mes.contasPagar)} a pagar +{" "}
                      {formatCurrency(mes.gastosFixos)} gastos fixos
                    </p>
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
                      mes.saldoAcumulado < 0
                        ? "text-rose-400"
                        : "text-emerald-400"
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
